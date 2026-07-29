import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Een Blob-store staat op openbaar of op besloten. Bij een besloten store
 * weigert Vercel een openbare upload, en dan moet de app het besloten proberen
 * en de foto via de eigen route uitserveren.
 */

const put = vi.fn();

vi.mock("@vercel/blob", () => ({
  put: (...args: unknown[]) => put(...args),
  del: vi.fn(),
  get: vi.fn(),
}));

const PRIVATE_STORE_ERROR = new Error(
  "Vercel Blob: Cannot use public access on a private store. The store is configured with private access.",
);

beforeEach(() => {
  vi.resetModules();
  put.mockReset();
  process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test_123";
});

async function freshStoreImage() {
  const storage = await import("@/lib/storage");
  return storage.storeImage;
}

describe("besloten Blob-store", () => {
  it("wijkt uit naar besloten en geeft ons eigen adres terug", async () => {
    put.mockRejectedValueOnce(PRIVATE_STORE_ERROR).mockResolvedValueOnce({
      url: "https://x.private.blob.vercel-storage.com/gifts/abc.png",
    });

    const storeImage = await freshStoreImage();
    const url = await storeImage(new Uint8Array([1, 2, 3]), "image/png");

    expect(url).toMatch(/^\/api\/photo\/gifts\/[a-f0-9]{24}\.png$/);
    expect(put).toHaveBeenCalledTimes(2);
    expect(put.mock.calls[0][2]).toMatchObject({ access: "public" });
    expect(put.mock.calls[1][2]).toMatchObject({ access: "private" });
  });

  it("onthoudt het, zodat de volgende foto meteen goed gaat", async () => {
    put.mockRejectedValueOnce(PRIVATE_STORE_ERROR).mockResolvedValue({
      url: "https://x.private.blob.vercel-storage.com/gifts/abc.png",
    });

    const storeImage = await freshStoreImage();
    await storeImage(new Uint8Array([1]), "image/png");
    put.mockClear();

    await storeImage(new Uint8Array([2]), "image/png");
    expect(put).toHaveBeenCalledTimes(1);
    expect(put.mock.calls[0][2]).toMatchObject({ access: "private" });
  });

  it("gebruikt bij een openbare store gewoon het blob-adres", async () => {
    put.mockResolvedValue({
      url: "https://x.public.blob.vercel-storage.com/gifts/abc.png",
    });

    const storeImage = await freshStoreImage();
    const url = await storeImage(new Uint8Array([1]), "image/png");

    expect(url).toBe("https://x.public.blob.vercel-storage.com/gifts/abc.png");
    expect(put).toHaveBeenCalledTimes(1);
  });

  it("laat een andere fout gewoon een fout blijven", async () => {
    put.mockRejectedValue(
      new Error("Vercel Blob: Access denied, please provide a valid token."),
    );

    const storeImage = await freshStoreImage();
    await expect(storeImage(new Uint8Array([1]), "image/png")).rejects.toThrow(
      "storage-token-invalid",
    );
    expect(put).toHaveBeenCalledTimes(1);
  });
});

describe("de fotoroute laat alleen eigen bestandsnamen door", () => {
  it("herkent onze namen en weert de rest", async () => {
    const { PHOTO_BLOB, PHOTO_LOCAL } = await import("@/lib/storage");

    expect(PHOTO_BLOB.test("gifts/0123456789abcdef01234567.jpg")).toBe(true);
    expect(PHOTO_BLOB.test("gifts/0123456789abcdef01234567.webp")).toBe(true);
    expect(PHOTO_LOCAL.test("local/0123456789abcdef01234567.jpg")).toBe(true);

    for (const pad of [
      "facturen/geheim.pdf",
      "gifts/../geheim.jpg",
      "gifts/kort.jpg",
      "local/../../etc/passwd",
      "local/0123456789abcdef01234567.txt",
    ]) {
      expect(PHOTO_BLOB.test(pad), pad).toBe(false);
      expect(PHOTO_LOCAL.test(pad), pad).toBe(false);
    }
  });
});
