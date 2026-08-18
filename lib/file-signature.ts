export type SafeUploadType = { ext: "pdf" | "jpg" | "png" | "webp" | "heic" | "heif"; mime: string };

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, Math.min(end, bytes.length)));
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

export function detectSafeUploadType(bytes: Uint8Array): SafeUploadType | null {
  if (bytes.length < 4) return null;

  if (ascii(bytes, 0, 5) === "%PDF-") return { ext: "pdf", mime: "application/pdf" };
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { ext: "jpg", mime: "image/jpeg" };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ext: "png", mime: "image/png" };
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return { ext: "webp", mime: "image/webp" };

  // HEIC/HEIF use ISO Base Media File Format. The ftyp box starts at byte 4 and
  // includes a major/compatible brand such as heic, heix, hevc, mif1 or msf1.
  if (bytes.length >= 16 && ascii(bytes, 4, 8) === "ftyp") {
    const brands = ascii(bytes, 8, 64);
    if (["heic", "heix", "hevc", "hevx"].some((brand) => brands.includes(brand))) {
      return { ext: "heic", mime: "image/heic" };
    }
    if (["mif1", "msf1", "heif"].some((brand) => brands.includes(brand))) {
      return { ext: "heif", mime: "image/heif" };
    }
  }

  return null;
}
