import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile account deletion is native and protected by explicit confirmation", () => {
  const accountView = read("ios/NavoPass/AccountView.swift");
  const apiClient = read("ios/NavoPass/APIClient.swift");
  const route = read("app/api/mobile/actions/route.ts");

  assert.match(accountView, /DeleteAccountView/);
  assert.match(accountView, /SecureField\("Current password"/);
  assert.match(accountView, /Type DELETE to confirm/);
  assert.match(accountView, /Delete account permanently/);
  assert.match(apiClient, /func deleteAccount\(password: String, confirmation: String\)/);
  assert.match(route, /action === "deleteAccount"/);
  assert.match(route, /isAccountDeletionConfirmation/);
  assert.match(route, /deleteAccountForUser/);
});

test("web and native deletion use the same destructive account service", () => {
  const webAction = read("app/actions/account.ts");
  const deletionService = read("lib/account-deletion.ts");

  assert.match(webAction, /deleteAccountForUser/);
  assert.match(deletionService, /subscriptions\.cancel/);
  assert.match(deletionService, /DELETE FROM users/);
  assert.match(deletionService, /SHARED_WORKSPACES_EXIST/);
});
