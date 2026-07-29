import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { MAX_MEMBERS, canEditList, isListOwner, joinList } from "@/lib/collab";

/**
 * De grens van tien mensen per lijst, tegen de echte database. Met tien man
 * erin hoort de elfde er netjes buiten te blijven.
 */

const stempel = Date.now();
const opgeruimd: string[] = [];

async function maakGebruiker(nummer: number) {
  const user = await prisma.user.create({
    data: {
      email: `collab-${stempel}-${nummer}@example.com`,
      passwordHash: "x",
      name: `Deelnemer ${nummer}`,
      handle: `collab-${stempel}-${nummer}`,
    },
    select: { id: true },
  });
  opgeruimd.push(user.id);
  return user.id;
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: opgeruimd } } });
});

describe("samen aan een lijst werken", () => {
  it("laat er hoogstens tien tegelijk in", async () => {
    const eigenaar = await maakGebruiker(0);
    const lijst = await prisma.list.create({
      data: {
        userId: eigenaar,
        title: "Samen",
        shareCode: `collab-${stempel}`,
      },
      select: { id: true },
    });

    // De eigenaar telt mee, dus er passen er nog negen bij.
    for (let nummer = 1; nummer < MAX_MEMBERS; nummer++) {
      const id = await maakGebruiker(nummer);
      expect(await joinList(id, lijst.id), `nummer ${nummer}`).toBe("joined");
    }

    const teveel = await maakGebruiker(MAX_MEMBERS);
    expect(await joinList(teveel, lijst.id)).toBe("full");
    expect(await canEditList(teveel, lijst.id)).toBe(false);
  });

  it("geeft deelnemers wel de cadeaus maar niet de instellingen", async () => {
    const eigenaar = await maakGebruiker(100);
    const helper = await maakGebruiker(101);
    const vreemde = await maakGebruiker(102);

    const lijst = await prisma.list.create({
      data: {
        userId: eigenaar,
        title: "Van mij",
        shareCode: `collab-${stempel}-b`,
      },
      select: { id: true },
    });

    expect(await joinList(helper, lijst.id)).toBe("joined");

    expect(await canEditList(helper, lijst.id)).toBe(true);
    expect(await isListOwner(helper, lijst.id)).toBe(false);

    expect(await canEditList(vreemde, lijst.id)).toBe(false);
    expect(await isListOwner(eigenaar, lijst.id)).toBe(true);
  });

  it("laat dezelfde persoon niet twee keer meedoen", async () => {
    const eigenaar = await maakGebruiker(200);
    const helper = await maakGebruiker(201);
    const lijst = await prisma.list.create({
      data: {
        userId: eigenaar,
        title: "Dubbel",
        shareCode: `collab-${stempel}-c`,
      },
      select: { id: true },
    });

    expect(await joinList(helper, lijst.id)).toBe("joined");
    expect(await joinList(helper, lijst.id)).toBe("already");
    expect(await joinList(eigenaar, lijst.id)).toBe("already");
  });
});
