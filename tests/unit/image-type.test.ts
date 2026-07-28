import { describe, expect, it } from "vitest";
import {
  ALLOWED_IMAGE_TYPES,
  HEIF_TYPES,
  sniffImageType,
} from "@/lib/image-type";

/** Bouwt een ISO-BMFF-kop: 4 bytes lengte, "ftyp", en het merk. */
function isoBmff(brand: string) {
  const header = new Uint8Array(16);
  header.set([0, 0, 0, 0x18], 0);
  header.set([..."ftyp"].map((c) => c.charCodeAt(0)), 4);
  header.set([...brand].map((c) => c.charCodeAt(0)), 8);
  return header;
}

function bytes(...values: number[]) {
  return new Uint8Array([...values, ...new Array(16).fill(0)]);
}

describe("sniffImageType", () => {
  it("herkent JPEG", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
  });

  it("herkent PNG", () => {
    expect(
      sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    ).toBe("image/png");
  });

  it("herkent GIF", () => {
    expect(sniffImageType(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toBe(
      "image/gif",
    );
  });

  it("herkent WebP aan de RIFF-container", () => {
    const riff = new Uint8Array(16);
    riff.set([..."RIFF"].map((c) => c.charCodeAt(0)), 0);
    riff.set([..."WEBP"].map((c) => c.charCodeAt(0)), 8);
    expect(sniffImageType(riff)).toBe("image/webp");
  });

  it("herkent AVIF", () => {
    expect(sniffImageType(isoBmff("avif"))).toBe("image/avif");
  });

  it("herkent HEIC uit de iPhone-galerij", () => {
    expect(sniffImageType(isoBmff("heic"))).toBe("image/heic");
    expect(sniffImageType(isoBmff("mif1"))).toBe("image/heif");
  });

  it("geeft null bij iets wat geen afbeelding is", () => {
    expect(sniffImageType(bytes(0x25, 0x50, 0x44, 0x46))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });

  it("houdt HEIC buiten de formaten die we opslaan", () => {
    for (const type of HEIF_TYPES) {
      expect(ALLOWED_IMAGE_TYPES.has(type)).toBe(false);
    }
  });
});
