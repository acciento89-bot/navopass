"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset, roleCanManage } from "@/lib/assets";
import { query } from "@/lib/db";
import { brandedMail, escapeHtml, isMailConfigured, sendMail } from "@/lib/mailer";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL?.trim() || "support@kamilunavo.com";
const quantities = new Set([5, 10, 25]);
const sizes = new Set([30, 40]);
const materials = new Set(["OUTDOOR_MATTE", "OUTDOOR_GLOSS"]);

function text(formData: FormData, key: string, max = 300) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function fail(assetId: string, message: string): never {
  redirect(`/app/assets/${assetId}/sticker?error=${encodeURIComponent(message)}`);
}

export async function requestQrStickerOrderAction(formData: FormData) {
  const user = await requireUser();
  const assetId = text(formData, "assetId", 80);
  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset || !roleCanManage(asset, user.id)) fail(assetId, "Nur Inhaber oder Admins können QR-Aufkleber für diesen Pass anfragen.");

  const quantity = Number.parseInt(text(formData, "quantity", 10), 10);
  const sizeMm = Number.parseInt(text(formData, "sizeMm", 10), 10);
  const material = text(formData, "material", 40);
  const recipientName = text(formData, "recipientName", 160);
  const company = text(formData, "company", 180) || null;
  const street = text(formData, "street", 180);
  const postalCode = text(formData, "postalCode", 20);
  const city = text(formData, "city", 120);
  const country = text(formData, "country", 2).toUpperCase() || "DE";
  const note = text(formData, "note", 1000) || null;

  if (!quantities.has(quantity)) fail(assetId, "Bitte eine gültige Stückzahl auswählen.");
  if (!sizes.has(sizeMm)) fail(assetId, "Bitte eine gültige Aufklebergröße auswählen.");
  if (!materials.has(material)) fail(assetId, "Bitte eine gültige Ausführung auswählen.");
  if (recipientName.length < 2 || street.length < 3 || postalCode.length < 3 || city.length < 2 || country.length !== 2) {
    fail(assetId, "Bitte die Lieferadresse vollständig angeben.");
  }

  const result = await query<{ id: string }>(
    `INSERT INTO qr_sticker_orders
      (user_id,asset_id,quantity,size_mm,material,recipient_name,company,street,postal_code,city,country,note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`,
    [user.id, asset.id, quantity, sizeMm, material, recipientName, company, street, postalCode, city, country, note]
  );

  if (isMailConfigured()) {
    const appUrl = (process.env.APP_URL || "https://navopass.de").replace(/\/$/, "");
    const orderId = result.rows[0].id;
    const materialLabel = material === "OUTDOOR_GLOSS" ? "wetterfest glänzend" : "wetterfest matt";
    const address = [recipientName, company, street, `${postalCode} ${city}`, country].filter(Boolean).join("\n");
    const noteHtml = note ? `<p><b>Hinweis:</b><br>${escapeHtml(note).replaceAll("\n", "<br>")}</p>` : "";
    const html = brandedMail({
      title: "Neue QR-Aufkleber-Anfrage",
      intro: `${user.name} (${user.email}) möchte ${quantity} QR-Aufkleber für „${asset.name}“ anfragen.`,
      actionLabel: "Objektpass öffnen",
      actionUrl: `${appUrl}/app/assets/${asset.id}`,
      footer: `Anfrage-ID: ${orderId}. Dies ist zunächst eine Bestellanfrage; Preis und Produktion werden separat bestätigt.`,
    }).replace(
      "<hr style=\"border:0;border-top:1px solid #e4edf2;margin:30px 0 20px\">",
      `<div style="margin:24px 0;padding:18px;border-radius:14px;background:#f4f8fb;color:#29475e;line-height:1.65"><b>${quantity} Stück · ${sizeMm}×${sizeMm} mm · ${materialLabel}</b><br><br>${escapeHtml(address).replaceAll("\n", "<br>")}${noteHtml}</div><hr style="border:0;border-top:1px solid #e4edf2;margin:30px 0 20px">`
    );

    await sendMail({
      to: SUPPORT_EMAIL,
      replyTo: user.email,
      subject: `[NavoPass] QR-Aufkleber ${asset.name} · ${quantity} Stück`,
      text: `Neue QR-Aufkleber-Anfrage\n\nPass: ${asset.name} (#${asset.public_id})\nMenge: ${quantity}\nGröße: ${sizeMm}x${sizeMm} mm\nAusführung: ${materialLabel}\n\nLieferadresse:\n${address}\n\nHinweis: ${note || "—"}\n\nAnfrage-ID: ${orderId}`,
      html,
    }).catch((error) => console.error("NavoPass sticker order notification failed", error));
  }

  revalidatePath(`/app/assets/${asset.id}/sticker`);
  redirect(`/app/assets/${asset.id}/sticker?success=1`);
}
