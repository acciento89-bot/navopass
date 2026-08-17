"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { sendVerificationEmail, verifyEmailToken } from "@/lib/email-verification";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function resendVerificationAction(formData: FormData) {
  const user = await requireUser();
  const next = text(formData, "next");
  const returnTo = next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  const state = await sendVerificationEmail(user);
  const message = state === "sent"
    ? "Bestätigungs-E-Mail wurde gesendet."
    : state === "already-verified"
      ? "Deine E-Mail-Adresse ist bereits bestätigt."
      : state === "rate-limited"
        ? "Bitte warte kurz, bevor du eine weitere Bestätigungs-E-Mail anforderst."
        : state === "unconfigured"
          ? "Der E-Mail-Versand ist noch nicht eingerichtet."
          : "Die Bestätigungs-E-Mail konnte gerade nicht gesendet werden.";
  const separator = returnTo.includes("?") ? "&" : "?";
  redirect(`${returnTo}${separator}verification=${encodeURIComponent(message)}`);
}

export async function verifyEmailAction(formData: FormData) {
  const token = text(formData, "token");
  if (!token) redirect("/email-bestaetigen?error=Der%20Bestätigungslink%20ist%20ungültig.");
  const verified = await verifyEmailToken(token);
  if (!verified) redirect("/email-bestaetigen?error=Der%20Bestätigungslink%20ist%20ungültig%20oder%20abgelaufen.");
  redirect("/email-bestaetigen?success=1");
}
