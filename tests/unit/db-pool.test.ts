import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

describe("verbindingspool", () => {
  it("hergebruikt één client in plaats van er per query een te openen", async () => {
    // De export is een proxy die de client pas bij gebruik maakt. Zonder cache
    // opende élke eigenschapstoegang een nieuwe verbindingspool die nooit meer
    // dichtging — de database liep dan binnen enkele tientallen verzoeken vol.
    const eerste = prisma.user;
    const tweede = prisma.user;
    expect(eerste).toBe(tweede);
  });

  it("blijft werken over meerdere queries heen", async () => {
    // Twintig achtereenvolgende queries mogen samen niet meer dan één pool
    // gebruiken; anders faalt dit met TooManyConnections.
    for (let i = 0; i < 20; i++) {
      await prisma.user.count();
    }
    expect(await prisma.user.count()).toBeGreaterThanOrEqual(0);
  });
});
