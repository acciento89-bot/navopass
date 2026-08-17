import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST?.trim() || "";
const smtpPort = Number.parseInt(process.env.SMTP_PORT || "587", 10);
const smtpUser = process.env.SMTP_USER?.trim() || "";
const smtpPass = process.env.SMTP_PASS || "";
const smtpFrom = process.env.SMTP_FROM?.trim() || "";
const smtpSecure = process.env.SMTP_SECURE
  ? ["1", "true", "yes", "on"].includes(process.env.SMTP_SECURE.toLowerCase())
  : smtpPort === 465;

export function isMailConfigured() {
  return Boolean(smtpHost && smtpFrom && Number.isFinite(smtpPort));
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!isMailConfigured()) throw new Error("SMTP is not configured");
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    });
  }
  return transporter;
}

export async function sendMail({
  to,
  subject,
  text,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}) {
  return getTransporter().sendMail({
    from: smtpFrom,
    to,
    subject,
    text,
    html,
    replyTo,
  });
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function brandedMail({ title, intro, actionLabel, actionUrl, footer }: { title: string; intro: string; actionLabel?: string; actionUrl?: string; footer?: string }) {
  const safeTitle = escapeHtml(title);
  const safeIntro = escapeHtml(intro);
  const safeFooter = escapeHtml(footer || "Wenn du diese Nachricht nicht angefordert hast, kannst du sie ignorieren.");
  const action = actionLabel && actionUrl
    ? `<p style="margin:28px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:#0b6e9d;color:#fff;text-decoration:none;font-weight:700">${escapeHtml(actionLabel)}</a></p><p style="font-size:12px;color:#74889a;word-break:break-all">${escapeHtml(actionUrl)}</p>`
    : "";

  return `<!doctype html><html><body style="margin:0;background:#f4f8fb;font-family:Arial,sans-serif;color:#183653"><div style="max-width:620px;margin:0 auto;padding:34px 18px"><div style="background:#fff;border:1px solid #dfe9ee;border-radius:24px;padding:34px"><div style="font-weight:800;font-size:20px;color:#102847;margin-bottom:28px">NavoPass</div><h1 style="font-size:28px;line-height:1.15;margin:0 0 14px;color:#102847">${safeTitle}</h1><p style="font-size:15px;line-height:1.7;color:#4d687d;margin:0">${safeIntro}</p>${action}<hr style="border:0;border-top:1px solid #e4edf2;margin:30px 0 20px"><p style="font-size:12px;line-height:1.6;color:#8394a1;margin:0">${safeFooter}</p></div></div></body></html>`;
}
