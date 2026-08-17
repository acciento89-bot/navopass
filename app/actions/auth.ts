"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { createSession, destroySession, findUserByEmail, hashPassword, normalizeEmail, safeNext, verifyPassword } from "@/lib/auth";
import { query, transaction } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email-verification";
import { brandedMail, isMailConfigured, sendMail } from "@/lib/mailer";
import { ensurePersonalWorkspace } from "@/lib/workspaces";

const TERMS_VERSION = "2026-08-15";
const RESET_TTL_MINUTES = 60;
const RESET_WINDOW_MINUTES = 15;
const RESET_WINDOW_LIMIT = 3;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function errorTarget(path: "login" | "register", message: string, next: string) {
  const params = new URLSearchParams({ error: message });
  if (next !== "/app") params.set("next", next);
  return `/${path}?${params.toString()}`;
}

function resetHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function resetTarget(token: string, error?: string) {
  const params = new URLSearchParams({ token });
  if (error) params.set("error", error);
  return `/passwort-zuruecksetzen?${params.toString()}`;
}

export async function registerAction(formData: FormData) {
  const name = text(formData, "name");
  const email = normalizeEmail(text(formData, "email"));
  const password = text(formData, "password");
  const next = safeNext(text(formData, "next"));
  const legalAccepted = formData.get("legalAccepted") === "on";

  if (name.length < 2) redirect(errorTarget("register", "Bitte Namen angeben", next));
  if (!email.includes("@")) redirect(errorTarget("register", "Bitte gültige E-Mail angeben", next));
  if (password.length < 8) redirect(errorTarget("register", "Passwort muss mindestens 8 Zeichen haben", next));
  if (!legalAccepted) redirect(errorTarget("register", "Bitte Nutzungsbedingungen akzeptieren und Datenschutz zur Kenntnis nehmen", next));

  const existing = await findUserByEmail(email);
  if (existing) redirect(errorTarget("login", "Konto existiert bereits", next));

  const passwordHash = await hashPassword(password);
  const result = await query<{ id: string }>(
    `INSERT INTO users (email,name,password_hash,terms_accepted_at,terms_version,privacy_acknowledged_at)
     VALUES ($1,$2,$3,now(),$4,now()) RETURNING id`,
    [email, name, passwordHash, TERMS_VERSION]
  );
  const userId = result.rows[0].id;
  await ensurePersonalWorkspace({ id: userId, name });
  await createSession(userId);
  await sendVerificationEmail({ id: userId, email, name, email_verified_at: null }).catch((error) => {
    console.error("NavoPass registration verification email failed", error);
  });
  redirect(next);
}

export async function loginAction(formData: FormData) {
  const email = normalizeEmail(text(formData, "email"));
  const password = text(formData, "password");
  const next = safeNext(text(formData, "next"));
  const user = await findUserByEmail(email);

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    redirect(errorTarget("login", "E-Mail oder Passwort ist falsch", next));
  }

  await createSession(user.id);
  redirect(next);
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = normalizeEmail(text(formData, "email"));
  if (!email.includes("@")) redirect("/passwort-vergessen?error=Bitte%20eine%20gültige%20E-Mail-Adresse%20angeben");
  if (!isMailConfigured()) redirect("/passwort-vergessen?error=Der%20E-Mail-Versand%20ist%20vorübergehend%20nicht%20verfügbar.%20Bitte%20versuche%20es%20später%20erneut.");

  const user = await findUserByEmail(email);
  if (user) {
    const recent = await query<{ count: number }>(
      `SELECT count(*)::int AS count FROM password_reset_tokens
       WHERE user_id=$1 AND created_at > now() - ($2::text || ' minutes')::interval`,
      [user.id, RESET_WINDOW_MINUTES]
    );

    if ((recent.rows[0]?.count ?? 0) < RESET_WINDOW_LIMIT) {
      const token = randomBytes(32).toString("base64url");
      const tokenHash = resetHash(token);
      const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

      await transaction(async (client) => {
        await client.query("UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL", [user.id]);
        await client.query(
          "INSERT INTO password_reset_tokens (user_id,token_hash,expires_at) VALUES ($1,$2,$3)",
          [user.id, tokenHash, expiresAt]
        );
      });

      const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
      const url = `${appUrl}/passwort-zuruecksetzen?token=${encodeURIComponent(token)}`;
      const subject = "NavoPass Passwort zurücksetzen";
      const intro = `Hallo ${user.name}, über diesen Link kannst du dein NavoPass-Passwort neu setzen. Der Link ist ${RESET_TTL_MINUTES} Minuten gültig und kann nur einmal verwendet werden.`;

      try {
        await sendMail({
          to: user.email,
          subject,
          text: `${intro}\n\n${url}\n\nWenn du diese Änderung nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
          html: brandedMail({
            title: "Passwort zurücksetzen",
            intro,
            actionLabel: "Neues Passwort festlegen",
            actionUrl: url,
          }),
        });
      } catch (error) {
        console.error("NavoPass password reset email failed", error);
        await query("UPDATE password_reset_tokens SET used_at=now() WHERE token_hash=$1", [tokenHash]).catch(() => undefined);
      }
    }
  }

  redirect("/passwort-vergessen?sent=1");
}

export async function resetPasswordAction(formData: FormData) {
  const token = text(formData, "token");
  const password = text(formData, "password");
  const confirmation = text(formData, "confirmation");

  if (!token) redirect("/passwort-vergessen?error=Der%20Zurücksetzen-Link%20ist%20ungültig");
  if (password.length < 8) redirect(resetTarget(token, "Das Passwort muss mindestens 8 Zeichen haben"));
  if (password !== confirmation) redirect(resetTarget(token, "Die Passwörter stimmen nicht überein"));

  const tokenHash = resetHash(token);
  const existing = await query<{ user_id: string }>(
    `SELECT user_id FROM password_reset_tokens
     WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() LIMIT 1`,
    [tokenHash]
  );
  if (!existing.rows[0]) redirect(resetTarget(token, "Der Link ist ungültig oder abgelaufen"));

  const passwordHash = await hashPassword(password);
  const changed = await transaction(async (client) => {
    const locked = await client.query<{ user_id: string }>(
      `SELECT user_id FROM password_reset_tokens
       WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now()
       FOR UPDATE`,
      [tokenHash]
    );
    const row = locked.rows[0];
    if (!row) return false;
    await client.query("UPDATE users SET password_hash=$1 WHERE id=$2", [passwordHash, row.user_id]);
    await client.query("UPDATE password_reset_tokens SET used_at=now() WHERE token_hash=$1", [tokenHash]);
    await client.query("DELETE FROM sessions WHERE user_id=$1", [row.user_id]);
    return true;
  });

  if (!changed) redirect(resetTarget(token, "Der Link wurde bereits verwendet oder ist abgelaufen"));
  redirect("/login?success=Passwort%20geändert.%20Du%20kannst%20dich%20jetzt%20anmelden.");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
