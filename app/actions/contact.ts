"use server";

import { redirect } from "next/navigation";
import { brandedMail, escapeHtml, isMailConfigured, sendMail } from "@/lib/mailer";
import { consumeRateLimit, requestIp } from "@/lib/rate-limit";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL?.trim() || "support@kamilunavo.com";
const allowedTopics = new Set([
  "Allgemeine Anfrage",
  "Produktsupport",
  "Konto & Zugang",
  "Datenschutzanfrage",
  "Geschäftliche Anfrage",
]);

function value(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function fail(message: string): never {
  redirect(`/kontakt?error=${encodeURIComponent(message)}#kontaktformular`);
}

export async function sendContactAction(formData: FormData) {
  const honeypot = value(formData, "companyWebsite", 200);
  if (honeypot) redirect("/kontakt?sent=1#kontaktformular");

  const ip = await requestIp();
  const limit = await consumeRateLimit({ scope: "contact:ip", identifier: ip, limit: 6, windowSeconds: 15 * 60 });
  if (!limit.allowed) fail("Zu viele Nachrichten in kurzer Zeit. Bitte versuche es später erneut oder schreibe direkt an support@kamilunavo.com.");

  const name = value(formData, "name", 120);
  const email = value(formData, "email", 240).toLowerCase();
  const requestedTopic = value(formData, "topic", 80);
  const topic = allowedTopics.has(requestedTopic) ? requestedTopic : "Allgemeine Anfrage";
  const message = value(formData, "message", 5000);
  const privacy = formData.get("privacy") === "on";

  if (name.length < 2) fail("Bitte gib deinen Namen an.");
  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) fail("Bitte gib eine gültige E-Mail-Adresse an.");
  if (message.length < 10) fail("Bitte beschreibe dein Anliegen etwas genauer.");
  if (!privacy) fail("Bitte bestätige, dass du die Datenschutzerklärung gelesen hast.");
  if (!isMailConfigured()) fail("Der Nachrichtenversand ist vorübergehend nicht verfügbar. Bitte nutze support@kamilunavo.com.");

  const subject = `[NavoPass] ${topic}`;
  const intro = `${name} (${email}) hat über navopass.de eine Nachricht zum Thema „${topic}“ gesendet.`;
  const htmlMessage = escapeHtml(message).replaceAll("\n", "<br>");
  const html = brandedMail({
    title: `Neue Anfrage: ${topic}`,
    intro,
    footer: "Diese Nachricht wurde über das NavoPass-Kontaktformular übermittelt. Antworte direkt auf diese E-Mail, um den Absender zu erreichen.",
  }).replace(
    "<hr style=\"border:0;border-top:1px solid #e4edf2;margin:30px 0 20px\">",
    `<div style="margin:26px 0;padding:18px;border-radius:14px;background:#f4f8fb;color:#29475e;line-height:1.65">${htmlMessage}</div><hr style="border:0;border-top:1px solid #e4edf2;margin:30px 0 20px">`
  );

  try {
    await sendMail({
      to: SUPPORT_EMAIL,
      replyTo: email,
      subject,
      text: `${intro}\n\n${message}\n\nAntwort an: ${email}`,
      html,
    });
  } catch (error) {
    console.error("NavoPass contact email failed", error);
    fail("Die Nachricht konnte gerade nicht gesendet werden. Bitte versuche es später erneut oder schreibe direkt an support@kamilunavo.com.");
  }

  redirect("/kontakt?sent=1#kontaktformular");
}
