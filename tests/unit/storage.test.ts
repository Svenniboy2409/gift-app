import { afterEach, describe, expect, it } from "vitest";
import { StorageError, blobToken, storeImage } from "@/lib/storage";

const SAVED = { ...process.env };

afterEach(() => {
  process.env = { ...SAVED };
});

describe("blobToken", () => {
  it("pakt de standaardnaam", () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_abc_123";
    expect(blobToken()).toEqual({
      name: "BLOB_READ_WRITE_TOKEN",
      value: "vercel_blob_rw_abc_123",
    });
  });

  it("vindt de sleutel ook onder een eigen voorvoegsel", () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.FOTOS_READ_WRITE_TOKEN = "vercel_blob_rw_xyz_789";
    expect(blobToken()).toEqual({
      name: "FOTOS_READ_WRITE_TOKEN",
      value: "vercel_blob_rw_xyz_789",
    });
  });

  it("trapt niet in een andere sleutel die zo heet", () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.REDIS_READ_WRITE_TOKEN = "iets-heel-anders";
    expect(blobToken()).toBeNull();
  });

  it("negeert een lege waarde", () => {
    process.env.BLOB_READ_WRITE_TOKEN = "   ";
    expect(blobToken()).toBeNull();
  });
});

describe("storeImage zonder opslag", () => {
  it("zegt op Vercel meteen dat de koppeling ontbreekt", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.VERCEL = "1";

    // Zonder deze afslag zou hij naar /var/task/public willen schrijven en
    // stuklopen op een ENOENT waar niemand iets aan heeft.
    await expect(storeImage(new Uint8Array([1, 2, 3]), "image/png")).rejects.toThrow(
      StorageError,
    );
    await expect(
      storeImage(new Uint8Array([1, 2, 3]), "image/png"),
    ).rejects.toThrow("storage-unconfigured");
  });
});
