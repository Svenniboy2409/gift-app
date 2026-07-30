import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  MAX_MEMBERS,
  canEditList,
  isHiddenOnProfile,
  isListOwner,
  joinList,
  setHiddenOnProfile,
} from "@/lib/collab";
import { getPublicProfile } from "@/lib/lists";

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

  it("laat een deelnemer de lijst van zijn eigen profiel halen", async () => {
    const eigenaar = await maakGebruiker(300);
    const helper = await maakGebruiker(301);
    const lijst = await prisma.list.create({
      data: {
        userId: eigenaar,
        title: "Op het profiel",
        shareCode: `collab-${stempel}-d`,
        visibility: "PUBLIC",
      },
      select: { id: true },
    });
    expect(await joinList(helper, lijst.id)).toBe("joined");

    const titels = async (nummer: number) => {
      const profiel = await getPublicProfile(`collab-${stempel}-${nummer}`);
      return profiel!.lists.map((lijst) => lijst.title);
    };

    // De eigenaar zet hem op ieders profiel, dus ook op dat van de helper.
    expect(await isHiddenOnProfile(helper, lijst.id)).toBe(false);
    expect(await titels(301)).toContain("Op het profiel");

    await setHiddenOnProfile(helper, lijst.id, true);

    // Weg bij de helper, en nergens anders iets veranderd.
    expect(await isHiddenOnProfile(helper, lijst.id)).toBe(true);
    expect(await titels(301)).not.toContain("Op het profiel");
    expect(await titels(300)).toContain("Op het profiel");

    // En terugzetten mag natuurlijk ook.
    await setHiddenOnProfile(helper, lijst.id, false);
    expect(await titels(301)).toContain("Op het profiel");

    // De eigenaar doet dit met de zichtbaarheid van de lijst zelf; voor hem is
    // er niets te verbergen.
    expect(await isHiddenOnProfile(eigenaar, lijst.id)).toBeNull();
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
