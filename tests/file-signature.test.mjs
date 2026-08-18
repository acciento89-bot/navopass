import test from "node:test";
import assert from "node:assert/strict";
import { detectSafeUploadType } from "../lib/file-signature.ts";

const ascii = (value) => new TextEncoder().encode(value);

function box(brand) {
  const bytes = new Uint8Array(24);
  bytes.set([0, 0, 0, 24], 0);
  bytes.set(ascii("ftyp"), 4);
  bytes.set(ascii(brand), 8);
  bytes.set(ascii("mif1"), 16);
  return bytes;
}

test("detects PDF by magic bytes", () => {
  assert.deepEqual(detectSafeUploadType(ascii("%PDF-1.7 example")), { ext: "pdf", mime: "application/pdf" });
});

test("detects JPEG and PNG signatures", () => {
  assert.deepEqual(detectSafeUploadType(new Uint8Array([255, 216, 255, 224, 0])), { ext: "jpg", mime: "image/jpeg" });
  assert.deepEqual(detectSafeUploadType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])), { ext: "png", mime: "image/png" });
});

test("detects WebP RIFF container", () => {
  const bytes = new Uint8Array(16);
  bytes.set(ascii("RIFF"), 0);
  bytes.set(ascii("WEBP"), 8);
  assert.deepEqual(detectSafeUploadType(bytes), { ext: "webp", mime: "image/webp" });
});

test("detects HEIC and HEIF brands", () => {
  assert.deepEqual(detectSafeUploadType(box("heic")), { ext: "heic", mime: "image/heic" });
  assert.deepEqual(detectSafeUploadType(box("mif1")), { ext: "heif", mime: "image/heif" });
});

test("rejects arbitrary content", () => {
  assert.equal(detectSafeUploadType(ascii("not really a file.pdf")), null);
  assert.equal(detectSafeUploadType(new Uint8Array([1, 2, 3])), null);
});
