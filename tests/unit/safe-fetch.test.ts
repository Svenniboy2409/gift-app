import { describe, expect, it } from "vitest";
import { FetchBlockedError, assertPublicUrl } from "@/lib/scraper/safe-fetch";

async function expectBlocked(url: string, reason?: string) {
  await expect(assertPublicUrl(url)).rejects.toThrow(FetchBlockedError);
  if (reason) {
    await expect(assertPublicUrl(url)).rejects.toThrow(reason);
  }
}

describe("assertPublicUrl", () => {
  it("blokkeert loopback-adressen", async () => {
    await expectBlocked("http://127.0.0.1/admin", "private-address");
    await expectBlocked("http://127.0.0.1:5432/", "private-address");
    await expectBlocked("http://localhost:3000/", "private-address");
    await expectBlocked("http://[::1]/", "private-address");
  });

  it("blokkeert de metadata-service van cloudproviders", async () => {
    await expectBlocked("http://169.254.169.254/latest/meta-data/", "private-address");
  });

  it("blokkeert privé-netwerken", async () => {
    await expectBlocked("http://10.0.0.5/", "private-address");
    await expectBlocked("http://192.168.1.1/", "private-address");
    await expectBlocked("http://172.16.0.9/", "private-address");
    await expectBlocked("http://172.31.255.1/", "private-address");
    await expectBlocked("http://0.0.0.0/", "private-address");
  });

  it("staat publieke IP's in dezelfde reeksen wél toe", async () => {
    await expect(assertPublicUrl("https://172.32.0.1/")).resolves.toBeInstanceOf(URL);
    await expect(assertPublicUrl("https://8.8.8.8/")).resolves.toBeInstanceOf(URL);
  });

  it("blokkeert andere protocollen", async () => {
    await expectBlocked("file:///etc/passwd", "invalid-protocol");
    await expectBlocked("ftp://example.com/x", "invalid-protocol");
    await expectBlocked("javascript:alert(1)", "invalid-protocol");
  });

  it("blokkeert onzin-invoer", async () => {
    await expectBlocked("niet eens een url", "invalid-url");
  });

  it("blokkeert .local- en .localhost-namen", async () => {
    await expectBlocked("http://printer.local/", "private-address");
    await expectBlocked("http://app.localhost/", "private-address");
  });
});
