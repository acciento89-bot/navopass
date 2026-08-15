"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, findUserByEmail, hashPassword, normalizeEmail, verifyPassword } from "@/lib/auth";
import { query } from "@/lib/db";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function registerAction(formData: FormData) {
  const name = text(formData, "name");
  const email = normalizeEmail(text(formData, "email"));
  const password = text(formData, "password");

  if (name.length < 2) redirect("/register?error=Bitte%20Namen%20angeben");
  if (!email.includes("@")) redirect("/register?error=Bitte%20gueltige%20E-Mail%20angeben");
  if (password.length < 8) redirect("/register?error=Passwort%20muss%20mindestens%208%20Zeichen%20haben");

  const existing = await findUserByEmail(email);
  if (existing) redirect("/login?error=Konto%20existiert%20bereits");

  const passwordHash = await hashPassword(password);
  const result = await query<{ id: string }>(
    "INSERT INTO users (email,name,password_hash) VALUES ($1,$2,$3) RETURNING id",
    [email, name, passwordHash]
  );
  await createSession(result.rows[0].id);
  redirect("/app");
}

export async function loginAction(formData: FormData) {
  const email = normalizeEmail(text(formData, "email"));
  const password = text(formData, "password");
  const user = await findUserByEmail(email);

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    redirect("/login?error=E-Mail%20oder%20Passwort%20ist%20falsch");
  }

  await createSession(user.id);
  redirect("/app");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
