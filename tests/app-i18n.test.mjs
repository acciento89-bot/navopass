import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the authenticated app activates the English coverage layer by locale", () => {
  const layout = read("app/app/layout.tsx");
  assert.match(layout, /getLocale\(\)/);
  assert.match(layout, /<AppEnglishLayer enabled=\{locale === "en"\}>/);
});

test("English coverage includes every critical authenticated app section", () => {
  const layer = read("components/app-english-layer.tsx");
  const criticalLabels = [
    "Haushalte & Teams",
    "Wartungszentrale",
    "Benachrichtigungen",
    "Einstellungen",
    "Letzte Änderungen",
    "QR-Aufkleber",
    "Serviceaufträge",
    "Kunden & Standorte",
    "Objektpass bearbeiten",
    "Servicezugriff verwalten",
    "Meine Aufkleber-Anfragen",
    "Druckvorlage",
    "Konto löschen",
    "Passwort ändern",
    "Kundenunterschrift",
  ];

  for (const label of criticalLabels) {
    assert.ok(layer.includes(`["${label}",`), `missing English mapping for: ${label}`);
  }
});

test("dynamic translations only match complete UI labels", () => {
  const layer = read("components/app-english-layer.tsx");
  assert.match(layer, /\/\^\(\\d\+\) Monate\$\//);
  assert.doesNotMatch(layer, /\/\\b\(\\d\+\) Monate\\b\/g/);
});
