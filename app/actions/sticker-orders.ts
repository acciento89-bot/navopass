"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset, listAssets, roleCanManage } from "@/lib/assets";
import { query, transaction } from "@/lib/db";
import { brandedMail, escapeHtml, isMailConfigured, sendMail } from "@/lib/mailer";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL?.trim() || "support@kamilunavo.com";
const quantities = new Set([1, 2]);
const sizes = new Set([30, 40]);
const materials = new Set(["OUTDOOR_MATTE", "OUTDOOR_GLOSS"]);
const MAX_BULK_ASSETS = 100;

function text(formData: FormData, key: string, max = 300) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function fail(assetId: string, message: string): never {
  redirect(`/app/assets/${assetId}/sticker?error=${encodeURIComponent(message)}`);
}

function failBulk(message: string): never {
  redirect(`/app/sticker/sammelanfrage?error=${encodeURIComponent(message)}`);
}

function readAddress(formData: FormData) {
  return {
    recipientName: text(formData, "recipientName", 160),
    company: text(formData, "company", 180) || null,
    street: text(formData, "street", 180),
    postalCode: text(formData, "postalCode", 20),
    city: text(formData, "city", 120),
    country: text(formData, "country", 2).toUpperCase() || "DE",
    note: text(formData, "note", 1000) || null,
  };
}

function addressIsValid(address: ReturnType<typeof readAddress>) {
  return address.recipientName.length >= 2 && address.street.length >= 3 && address.postalCode.length >= 3 && address.city.length >= 2 && address.country.length === 2;
}

export async function requestQrStickerOrderAction(formData: FormData) {
  const user = await requireUser();
  const assetId = text(formData, "assetId", 80);
  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset || !roleCanManage(asset, user.id)) fail(assetId, "Nur Inhaber oder Admins können QR-Aufkleber für diesen Pass anfragen.");

  const quantity = Number.parseInt(text(formData, "quantity", 10), 10);
  const sizeMm = Number.parseInt(text(formData, "sizeMm", 10), 10);
  const material = text(formData, "material", 40);
  const address = readAddress(formData);

  if (!quantities.has(quantity)) fail(assetId, "Pro Objektpass können 1 oder 2 QR-Aufkleber angefragt werden.");
  if (!sizes.has(sizeMm)) fail(assetId, "Bitte eine gültige Aufklebergröße auswählen.");
  if (!materials.has(material)) fail(assetId, "Bitte eine gültige Ausführung auswählen.");
  if (!addressIsValid(address)) fail(assetId, "Bitte die Lieferadresse vollständig angeben.");

  const result = await query<{ id: string }>(
    `INSERT INTO qr_sticker_orders
      (user_id,asset_id,quantity,size_mm,material,recipient_name,company,street,postal_code,city,country,note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`,
    [user.id, asset.id, quantity, sizeMm, material, address.recipientName, address.company, address.street, address.postalCode, address.city, address.country, address.note]
  );

  if (isMailConfigured()) {
    const appUrl = (process.env.APP_URL || "https://navopass.de").replace(/\/$/, "");
    const orderId = result.rows[0].id;
    const materialLabel = material === "OUTDOOR_GLOSS" ? "wetterfest glänzend" : "wetterfest matt";
    const addressText = [address.recipientName, address.company, address.street, `${address.postalCode} ${address.city}`, address.country].filter(Boolean).join("\n");
    const noteHtml = address.note ? `<p><b>Hinweis:</b><br>${escapeHtml(address.note).replaceAll("\n", "<br>")}</p>` : "";
    const html = brandedMail({
      title: "Neue QR-Aufkleber-Anfrage",
      intro: `${user.name} (${user.email}) möchte ${quantity} QR-Aufkleber für „${asset.name}“ anfragen.`,
      actionLabel: "Objektpass öffnen",
      actionUrl: `${appUrl}/app/assets/${asset.id}`,
      footer: `Anfrage-ID: ${orderId}. Dies ist zunächst eine Bestellanfrage; Preis und Produktion werden separat bestätigt.`,
    }).replace(
      "<hr style=\"border:0;border-top:1px solid #e4edf2;margin:30px 0 20px\">",
      `<div style="margin:24px 0;padding:18px;border-radius:14px;background:#f4f8fb;color:#29475e;line-height:1.65"><b>${quantity} Stück · ${sizeMm}×${sizeMm} mm · ${materialLabel}</b><br><br>${escapeHtml(addressText).replaceAll("\n", "<br>")}${noteHtml}</div><hr style="border:0;border-top:1px solid #e4edf2;margin:30px 0 20px">`
    );

    await sendMail({
      to: SUPPORT_EMAIL,
      replyTo: user.email,
      subject: `[NavoPass] QR-Aufkleber ${asset.name} · ${quantity} Stück`,
      text: `Neue QR-Aufkleber-Anfrage\n\nPass: ${asset.name} (#${asset.public_id})\nMenge: ${quantity}\nGröße: ${sizeMm}x${sizeMm} mm\nAusführung: ${materialLabel}\n\nLieferadresse:\n${addressText}\n\nHinweis: ${address.note || "—"}\n\nAnfrage-ID: ${orderId}`,
      html,
    }).catch((error) => console.error("NavoPass sticker order notification failed", error));
  }

  revalidatePath(`/app/assets/${asset.id}/sticker`);
  revalidatePath("/app/sticker");
  redirect(`/app/assets/${asset.id}/sticker?success=1`);
}

export async function requestBulkQrStickerOrderAction(formData: FormData) {
  const user = await requireUser();
  if (user.account_type !== "PROFESSIONAL") failBulk("Sammelanfragen sind für Firmen- und Technikerprofile vorgesehen.");

  const selectedIds = [...new Set(formData.getAll("assetIds").map(value => String(value).trim()).filter(Boolean))];
  const quantity = Number.parseInt(text(formData, "quantity", 10), 10);
  const sizeMm = Number.parseInt(text(formData, "sizeMm", 10), 10);
  const material = text(formData, "material", 40);
  const address = readAddress(formData);

  if (selectedIds.length === 0) failBulk("Bitte mindestens einen Objektpass auswählen.");
  if (selectedIds.length > MAX_BULK_ASSETS) failBulk(`Pro Sammelanfrage sind maximal ${MAX_BULK_ASSETS} Objektpässe möglich.`);
  if (!quantities.has(quantity)) failBulk("Pro ausgewähltem Objekt sind 1 oder 2 QR-Aufkleber möglich.");
  if (!sizes.has(sizeMm)) failBulk("Bitte eine gültige Aufklebergröße auswählen.");
  if (!materials.has(material)) failBulk("Bitte eine gültige Ausführung auswählen.");
  if (!addressIsValid(address)) failBulk("Bitte die Lieferadresse vollständig angeben.");

  const manageableAssets = (await listAssets(user.id)).filter(asset => !asset.archived_at && roleCanManage(asset, user.id));
  const byId = new Map(manageableAssets.map(asset => [asset.id, asset]));
  const selectedAssets = selectedIds.map(id => byId.get(id)).filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));
  if (selectedAssets.length !== selectedIds.length) failBulk("Mindestens ein ausgewählter Pass ist nicht mehr verfügbar oder darf von dir nicht verwaltet werden.");

  const orderIds = await transaction(async client => {
    const ids: string[] = [];
    for (const asset of selectedAssets) {
      const result = await client.query<{ id: string }>(
        `INSERT INTO qr_sticker_orders
          (user_id,asset_id,quantity,size_mm,material,recipient_name,company,street,postal_code,city,country,note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id`,
        [user.id, asset.id, quantity, sizeMm, material, address.recipientName, address.company, address.street, address.postalCode, address.city, address.country, address.note]
      );
      ids.push(result.rows[0].id);
    }
    return ids;
  });

  if (isMailConfigured()) {
    const materialLabel = material === "OUTDOOR_GLOSS" ? "wetterfest glänzend" : "wetterfest matt";
    const addressText = [address.recipientName, address.company, address.street, `${address.postalCode} ${address.city}`, address.country].filter(Boolean).join("\n");
    const assetLines = selectedAssets.map((asset, index) => `${index + 1}. ${asset.name} (#${asset.public_id}) · ${quantity} Stück`).join("\n");
    const totalStickers = selectedAssets.length * quantity;
    const htmlList = selectedAssets.map(asset => `<li><b>${escapeHtml(asset.name)}</b> (#${escapeHtml(asset.public_id)}) · ${quantity} Stück</li>`).join("");
    const noteHtml = address.note ? `<p><b>Hinweis:</b><br>${escapeHtml(address.note).replaceAll("\n", "<br>")}</p>` : "";
    const html = brandedMail({
      title: "Neue QR-Aufkleber-Sammelanfrage",
      intro: `${user.name} (${user.email}) hat ${selectedAssets.length} Objektpässe mit insgesamt ${totalStickers} QR-Aufklebern angefragt.`,
      footer: `Anfrage enthält ${orderIds.length} einzelne Objekt-Bestellpositionen. Preis und Produktion werden separat bestätigt.`,
    }).replace(
      "<hr style=\"border:0;border-top:1px solid #e4edf2;margin:30px 0 20px\">",
      `<div style="margin:24px 0;padding:18px;border-radius:14px;background:#f4f8fb;color:#29475e;line-height:1.65"><b>${sizeMm}×${sizeMm} mm · ${materialLabel}</b><ul>${htmlList}</ul><br>${escapeHtml(addressText).replaceAll("\n", "<br>")}${noteHtml}</div><hr style="border:0;border-top:1px solid #e4edf2;margin:30px 0 20px">`
    );

    await sendMail({
      to: SUPPORT_EMAIL,
      replyTo: user.email,
      subject: `[NavoPass] Sammelanfrage · ${selectedAssets.length} Objekte · ${totalStickers} Aufkleber`,
      text: `Neue QR-Aufkleber-Sammelanfrage\n\nObjekte: ${selectedAssets.length}\nGesamtmenge: ${totalStickers}\nGröße: ${sizeMm}x${sizeMm} mm\nAusführung: ${materialLabel}\n\n${assetLines}\n\nLieferadresse:\n${addressText}\n\nHinweis: ${address.note || "—"}`,
      html,
    }).catch((error) => console.error("NavoPass bulk sticker order notification failed", error));
  }

  for (const asset of selectedAssets) revalidatePath(`/app/assets/${asset.id}/sticker`);
  revalidatePath("/app/sticker");
  revalidatePath("/app/sticker/sammelanfrage");
  redirect(`/app/sticker/sammelanfrage?success=${selectedAssets.length}&stickers=${selectedAssets.length * quantity}`);
}
