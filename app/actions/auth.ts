"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, findUserByEmail, hashPassword, normalizeEmail, safeNext, verifyPassword } from "@/lib/auth";
import { query } from "@/lib/db";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function errorTarget(path: "login" | "register", message: string, next: string) {
  const params = new URLSearchParams({ error: message });
  if (next !== "/app") params.set("next", next);
  return `/${path}?${params.toString()}`;
}

export async function registerAction(formData: FormData) {
  const name = text(formData, "name");
  const email = normalizeEmail(text(formData, "email"));
  const password = text(formData, "password");
  const next = safeNext(text(formData, "next"));

  if (name.length < 2) redirect(errorTarget("register", "Bitte Namen angeben", next));
  if (!email.includes("@")) redirect(errorTarget("register", "Bitte gültige E-Mail angeben", next));
  if (password.length < 8) redirect(errorTarget("register", "Passwort muss mindestens 8 Zeichen haben", next));

  const existing = await findUserByEmail(email);
  if (existing) redirect(errorTarget("login", "Konto existiert bereits", next));

  const passwordHash = await hashPassword(password);
  const result = await query<{ id: string }>("INSERT INTO users (email,name,password_hash) VALUES ($1,$2,$3) RETURNING id", [email, name, passwordHash]);
  await createSession(result.rows[0].id);
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

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
