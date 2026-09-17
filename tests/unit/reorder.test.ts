import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createGift, getListForOwner, reorderGifts } from "@/lib/gifts";

const stempel = Date.now();
const opgeruimd: string[] = [];

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: opgeruimd } } });
});

describe("reorderGifts", () => {
  it("zet de cadeaus in de opgegeven volgorde", async () => {
    const user = await prisma.user.create({
      data: {
        email: `reorder-${stempel}@example.com`,
        passwordHash: "x",
        name: "Sorteerder",
        handle: `reorder-${stempel}`,
      },
      select: { id: true },
    });
    opgeruimd.push(user.id);

    const lijst = await prisma.list.create({
      data: { userId: user.id, title: "Volgorde", shareCode: `reord-${stempel}` },
      select: { id: true },
    });

    const namen = ["Een", "Twee", "Drie", "Vier"];
    const ids: string[] = [];
    for (const title of namen) {
      const gift = await createGift(user.id, lijst.id, { title });
      ids.push(gift!.id);
    }

    // Omgekeerd opslaan.
    const omgekeerd = [...ids].reverse();
    expect(await reorderGifts(user.id, lijst.id, omgekeerd)).toBe(true);

    const na = await getListForOwner(user.id, lijst.id);
    expect(na!.gifts.map((g) => g.title)).toEqual(["Vier", "Drie", "Twee", "Een"]);

    // En weer terug.
    await reorderGifts(user.id, lijst.id, ids);
    const terug = await getListForOwner(user.id, lijst.id);
    expect(terug!.gifts.map((g) => g.title)).toEqual(namen);
  });

  it("raakt de lijst van een ander niet aan", async () => {
    const vreemde = await prisma.user.create({
      data: {
        email: `vreemd-${stempel}@example.com`,
        passwordHash: "x",
        name: "Vreemde",
        handle: `vreemd-${stempel}`,
      },
      select: { id: true },
    });
    opgeruimd.push(vreemde.id);

    const eigenaar = await prisma.user.create({
      data: {
        email: `eig-${stempel}@example.com`,
        passwordHash: "x",
        name: "Eigenaar",
        handle: `eig-${stempel}`,
      },
      select: { id: true },
    });
    opgeruimd.push(eigenaar.id);

    const lijst = await prisma.list.create({
      data: { userId: eigenaar.id, title: "Van mij", shareCode: `mij-${stempel}` },
      select: { id: true },
    });
    const a = await createGift(eigenaar.id, lijst.id, { title: "A" });
    const b = await createGift(eigenaar.id, lijst.id, { title: "B" });

    expect(await reorderGifts(vreemde.id, lijst.id, [b!.id, a!.id])).toBe(false);

    const na = await getListForOwner(eigenaar.id, lijst.id);
    expect(na!.gifts.map((g) => g.title)).toEqual(["A", "B"]);
  });
});
