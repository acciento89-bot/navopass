import { createHash, randomBytes } from "node:crypto";
import { query, transaction } from "@/lib/db";
import { brandedMail, isMailConfigured, sendMail } from "@/lib/mailer";

const VERIFY_TTL_HOURS = 24;
const VERIFY_WINDOW_MINUTES = 15;
const VERIFY_WINDOW_LIMIT = 3;

function verificationHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type VerificationDelivery = "sent" | "already-verified" | "unconfigured" | "rate-limited" | "failed";

export async function sendVerificationEmail(user: { id: string; email: string; name: string; email_verified_at?: string | null }): Promise<VerificationDelivery> {
  if (user.email_verified_at) return "already-verified";
  if (!isMailConfigured()) return "unconfigured";

  const recent = await query<{ count: number }>(
    `SELECT count(*)::int AS count FROM email_verification_tokens
     WHERE user_id=$1 AND created_at > now() - ($2::text || ' minutes')::interval`,
    [user.id, VERIFY_WINDOW_MINUTES]
  );
  if ((recent.rows[0]?.count ?? 0) >= VERIFY_WINDOW_LIMIT) return "rate-limited";

  const token = randomBytes(32).toString("base64url");
  const tokenHash = verificationHash(token);
  const expiresAt = new Date(Date.now() + VERIFY_TTL_HOURS * 60 * 60 * 1000);

  await transaction(async (client) => {
    await client.query("UPDATE email_verification_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL", [user.id]);
    await client.query(
      "INSERT INTO email_verification_tokens (user_id,token_hash,expires_at) VALUES ($1,$2,$3)",
      [user.id, tokenHash, expiresAt]
    );
  });

  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const url = `${appUrl}/email-bestaetigen?token=${encodeURIComponent(token)}`;
  const intro = `Hallo ${user.name}, bestätige bitte deine E-Mail-Adresse ${user.email}. Der Link ist ${VERIFY_TTL_HOURS} Stunden gültig und kann nur einmal verwendet werden.`;

  try {
    await sendMail({
      to: user.email,
      subject: "NavoPass E-Mail-Adresse bestätigen",
      text: `${intro}\n\nE-Mail-Adresse bestätigen:\n${url}\n\nFalls du kein NavoPass-Konto erstellt hast, kannst du diese Nachricht ignorieren.`,
      html: brandedMail({
        title: "E-Mail-Adresse bestätigen",
        intro,
        actionLabel: "E-Mail bestätigen",
        actionUrl: url,
        footer: "Wenn du kein NavoPass-Konto erstellt hast, musst du nichts tun.",
      }),
    });
    return "sent";
  } catch (error) {
    console.error("NavoPass verification email failed", error);
    await query("UPDATE email_verification_tokens SET used_at=now() WHERE token_hash=$1", [tokenHash]).catch(() => undefined);
    return "failed";
  }
}

export async function verifyEmailToken(token: string) {
  const tokenHash = verificationHash(token);
  return transaction(async (client) => {
    const result = await client.query<{ id: string; user_id: string }>(
      `SELECT id,user_id FROM email_verification_tokens
       WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now()
       FOR UPDATE`,
      [tokenHash]
    );
    const row = result.rows[0];
    if (!row) return false;
    await client.query("UPDATE users SET email_verified_at=COALESCE(email_verified_at,now()) WHERE id=$1", [row.user_id]);
    await client.query("UPDATE email_verification_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL", [row.user_id]);
    return true;
  });
}
