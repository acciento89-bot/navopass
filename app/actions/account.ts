"use server";

import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { redirect } from "next/navigation";
import { createSession, destroyOtherSessions, destroySession, findUserByEmail, hashPassword, normalizeEmail, requireUser, verifyPassword } from "@/lib/auth";
import { getBillingState } from "@/lib/billing";
import { query } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email-verification";
import { getStripe } from "@/lib/stripe";

const UPLOAD_ROOT = process.env.UPLOAD_DIR || "/app/uploads";

function text(formData: FormData, key: string, max = 500) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const name = text(formData, "name", 160);
  const email = normalizeEmail(text(formData, "email", 320));
  if (name.length < 2) redirect("/app/settings?profileError=Bitte%20einen%20Namen%20angeben");
  if (!email.includes("@")) redirect("/app/settings?profileError=Bitte%20eine%20gueltige%20E-Mail%20angeben");

  const emailChanged = email !== user.email;
  if (emailChanged) {
    const existing = await findUserByEmail(email);
    if (existing && existing.id !== user.id) redirect("/app/settings?profileError=Diese%20E-Mail%20wird%20bereits%20verwendet");
    await query("UPDATE users SET name=$1,email=$2,email_verified_at=NULL WHERE id=$3", [name, email, user.id]);
    const delivery = await sendVerificationEmail({ id: user.id, email, name, email_verified_at: null }).catch((error) => {
      console.error("NavoPass changed-email verification failed", error);
      return "failed" as const;
    });
    const billing = await getBillingState(user.id).catch(() => null);
    if (billing?.stripe_customer_id) {
      getStripe().customers.update(billing.stripe_customer_id, { email, name }).catch((error) => console.error("NavoPass Stripe customer profile update failed", error));
    }
    const message = delivery === "sent"
      ? "Profil gespeichert. Bitte bestätige deine neue E-Mail-Adresse."
      : "Profil gespeichert. Die Bestätigungs-E-Mail konnte noch nicht gesendet werden.";
    redirect(`/app/settings?profileSuccess=${encodeURIComponent(message)}`);
  }

  await query("UPDATE users SET name=$1 WHERE id=$2", [name, user.id]);
  const billing = await getBillingState(user.id).catch(() => null);
  if (billing?.stripe_customer_id) {
    getStripe().customers.update(billing.stripe_customer_id, { name }).catch((error) => console.error("NavoPass Stripe customer name update failed", error));
  }
  redirect("/app/settings?profileSuccess=Profil%20gespeichert");
}

export async function updateReminderSettingsAction(formData: FormData) {
  const user = await requireUser();
  const raw = Number.parseInt(text(formData, "reminderDays", 10), 10);
  const reminderDays = Number.isFinite(raw) ? Math.max(1, Math.min(180, raw)) : 30;
  await query("UPDATE users SET reminder_days=$1 WHERE id=$2", [reminderDays, user.id]);
  redirect("/app/settings?reminderSuccess=Erinnerungen%20gespeichert");
}

export async function logoutOtherSessionsAction() {
  const user = await requireUser();
  await destroyOtherSessions(user.id);
  redirect("/app/settings?sessionsSuccess=Andere%20Sitzungen%20wurden%20abgemeldet");
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  const currentPassword = text(formData, "currentPassword", 500);
  const newPassword = text(formData, "newPassword", 500);
  const confirmPassword = text(formData, "confirmPassword", 500);
  const row = await findUserByEmail(user.email);
  if (!row || !(await verifyPassword(currentPassword, row.password_hash))) redirect("/app/settings?passwordError=Aktuelles%20Passwort%20ist%20falsch");
  if (newPassword.length < 8) redirect("/app/settings?passwordError=Das%20neue%20Passwort%20braucht%20mindestens%208%20Zeichen");
  if (newPassword !== confirmPassword) redirect("/app/settings?passwordError=Die%20neuen%20Passwoerter%20stimmen%20nicht%20ueberein");
  const passwordHash = await hashPassword(newPassword);
  await query("UPDATE users SET password_hash=$1 WHERE id=$2", [passwordHash, user.id]);
  await query("DELETE FROM sessions WHERE user_id=$1", [user.id]);
  await createSession(user.id);
  redirect("/app/settings?passwordSuccess=Passwort%20geaendert");
}

export async function deleteAccountAction(formData: FormData) {
  const user = await requireUser();
  const password = text(formData, "password", 500);
  const confirmation = text(formData, "confirmation", 40).toUpperCase();
  const row = await findUserByEmail(user.email);
  if (confirmation !== "LÖSCHEN" && confirmation !== "LOESCHEN") redirect("/app/settings?deleteError=Bitte%20LOESCHEN%20eingeben");
  if (!row || !(await verifyPassword(password, row.password_hash))) redirect("/app/settings?deleteError=Passwort%20ist%20falsch");

  const ownedShared = await query<{ count: number }>(
    `SELECT count(*)::int AS count FROM workspaces w
     WHERE w.owner_id=$1 AND w.kind<>'PERSONAL' AND EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=w.id AND wm.user_id<>$1)`,
    [user.id]
  );
  if ((ownedShared.rows[0]?.count ?? 0) > 0) redirect("/app/settings?deleteError=Bitte%20zuerst%20deine%20Haushalte%20oder%20Teams%20loeschen%20bzw.%20aufraeumen");

  const billing = await getBillingState(user.id);
  if (billing.stripe_subscription_id && billing.subscription_status !== "canceled" && billing.subscription_status !== "incomplete_expired") {
    try {
      await getStripe().subscriptions.cancel(billing.stripe_subscription_id);
    } catch (error) {
      console.error("NavoPass subscription cancellation before account deletion failed", error);
      redirect("/app/settings?deleteError=Das%20laufende%20Abo%20konnte%20nicht%20beendet%20werden.%20Das%20Konto%20wurde%20nicht%20geloescht.%20Bitte%20versuche%20es%20erneut.");
    }
  }

  await query(
    `UPDATE assets a SET owner_id=w.owner_id
     FROM workspaces w
     WHERE a.owner_id=$1 AND a.workspace_id=w.id AND w.owner_id<>$1`,
    [user.id]
  );

  const docs = await query<{ id: string; url: string }>(
    `SELECT d.id,d.url FROM asset_documents d JOIN assets a ON a.id=d.asset_id WHERE a.owner_id=$1`,
    [user.id]
  );
  await query("DELETE FROM users WHERE id=$1", [user.id]);
  await Promise.all(docs.rows.map(async (doc) => { if (doc.url.startsWith(`/api/files/${doc.id}/`)) await unlink(join(UPLOAD_ROOT, doc.id)).catch(() => undefined); }));
  await destroySession();
  redirect("/");
}
