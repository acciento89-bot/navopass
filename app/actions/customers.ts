"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset, roleCanManage } from "@/lib/assets";
import { ensureCustomerSchema } from "@/lib/customer-schema";
import { query } from "@/lib/db";

function text(formData: FormData, key: string, max = 300) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function customersUrl(message?: string, error = false) {
  if (!message) return "/app/kunden";
  return `/app/kunden?${error ? "error" : "success"}=${encodeURIComponent(message)}`;
}

function customerUrl(customerId: string, message?: string, error = false) {
  if (!message) return `/app/kunden/${customerId}`;
  return `/app/kunden/${customerId}?${error ? "error" : "success"}=${encodeURIComponent(message)}`;
}

export async function createCustomerAction(formData: FormData) {
  const user = await requireUser();
  if (user.account_type !== "PROFESSIONAL") redirect(customersUrl("Der Kundenbereich ist für berufliche Profile vorgesehen.", true));
  await ensureCustomerSchema();

  const name = text(formData, "name", 180);
  if (name.length < 2) redirect(customersUrl("Bitte einen Kundennamen angeben.", true));
  const country = (text(formData, "country", 2) || "DE").toUpperCase();

  await query(
    `INSERT INTO service_customers (user_id,name,contact_name,email,phone,street,postal_code,city,country,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      user.id,
      name,
      text(formData, "contactName", 180) || null,
      text(formData, "email", 220) || null,
      text(formData, "phone", 80) || null,
      text(formData, "street", 180) || null,
      text(formData, "postalCode", 30) || null,
      text(formData, "city", 140) || null,
      country,
      text(formData, "notes", 1500) || null,
    ]
  );
  revalidatePath("/app/kunden");
  redirect(customersUrl("Kunde wurde angelegt."));
}

export async function updateCustomerAction(formData: FormData) {
  const user = await requireUser();
  if (user.account_type !== "PROFESSIONAL") redirect("/app");
  await ensureCustomerSchema();

  const customerId = text(formData, "customerId", 80);
  if (!customerId) redirect(customersUrl("Kunde fehlt.", true));
  const existing = await query<{ id: string }>("SELECT id FROM service_customers WHERE id=$1 AND user_id=$2 LIMIT 1", [customerId, user.id]);
  if (!existing.rows[0]) redirect(customersUrl("Kunde wurde nicht gefunden.", true));

  const name = text(formData, "name", 180);
  if (name.length < 2) redirect(customerUrl(customerId, "Bitte einen Kundennamen angeben.", true));
  const country = (text(formData, "country", 2) || "DE").toUpperCase();
  if (country.length !== 2) redirect(customerUrl(customerId, "Bitte ein gültiges Land auswählen.", true));

  await query(
    `UPDATE service_customers
        SET name=$1,contact_name=$2,email=$3,phone=$4,street=$5,postal_code=$6,city=$7,country=$8,notes=$9,updated_at=now()
      WHERE id=$10 AND user_id=$11`,
    [
      name,
      text(formData, "contactName", 180) || null,
      text(formData, "email", 220) || null,
      text(formData, "phone", 80) || null,
      text(formData, "street", 180) || null,
      text(formData, "postalCode", 30) || null,
      text(formData, "city", 140) || null,
      country,
      text(formData, "notes", 1500) || null,
      customerId,
      user.id,
    ]
  );
  revalidatePath("/app/kunden");
  revalidatePath(`/app/kunden/${customerId}`);
  revalidatePath("/app/service");
  redirect(customerUrl(customerId, "Kundendaten wurden gespeichert."));
}

export async function assignAssetToCustomerAction(formData: FormData) {
  const user = await requireUser();
  if (user.account_type !== "PROFESSIONAL") redirect(customersUrl("Der Kundenbereich ist für berufliche Profile vorgesehen.", true));
  await ensureCustomerSchema();
  const assetId = text(formData, "assetId", 80);
  const customerId = text(formData, "customerId", 80);
  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset || !roleCanManage(asset, user.id)) redirect(customersUrl("Keine Berechtigung für diesen Objektpass.", true));
  if (customerId) {
    const customer = await query<{ id: string }>("SELECT id FROM service_customers WHERE id=$1 AND user_id=$2 LIMIT 1", [customerId, user.id]);
    if (!customer.rows[0]) redirect(customersUrl("Kunde wurde nicht gefunden.", true));
  }
  await query("UPDATE assets SET service_customer_id=$1,updated_at=now() WHERE id=$2", [customerId || null, assetId]);
  revalidatePath("/app/kunden");
  if (customerId) revalidatePath(`/app/kunden/${customerId}`);
  revalidatePath(`/app/assets/${assetId}`);
  revalidatePath("/app/service");
  redirect(customersUrl(customerId ? "Objekt wurde dem Kunden zugeordnet." : "Kundenzuordnung wurde entfernt."));
}

export async function deleteCustomerAction(formData: FormData) {
  const user = await requireUser();
  if (user.account_type !== "PROFESSIONAL") redirect(customersUrl("Der Kundenbereich ist für berufliche Profile vorgesehen.", true));
  await ensureCustomerSchema();
  const customerId = text(formData, "customerId", 80);
  if (!customerId) redirect(customersUrl("Kunde fehlt.", true));
  await query("DELETE FROM service_customers WHERE id=$1 AND user_id=$2", [customerId, user.id]);
  revalidatePath("/app/kunden");
  revalidatePath("/app/service");
  redirect(customersUrl("Kunde wurde gelöscht; Objektpässe bleiben erhalten."));
}
