import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getFriends } from "@/lib/friends";
import { getListInvites, inviteToList } from "@/lib/collab";
import { getVisitorListTitle } from "@/lib/gifts";
import type { Visibility } from "@/lib/generated/prisma/enums";

/**
 * `getFriends` en `getListInvites` zijn met de hand geschreven zoekopdrachten,
 * omdat Prisma er anders drie ritjes naar de database van maakte. Handwerk
 * betekent dat de kant van de vriendschap en de koppeling naar de namen hier
 * bewaakt moeten worden: één verkeerde kolom en je ziet jezelf in je eigen
 * vriendenlijst staan.
 */

const stempel = Date.now();
const opgeruimd: string[] = [];

async function maakGebruiker(naam: string) {
  const user = await prisma.user.create({
    data: {
      email: `${naam}-${stempel}@example.com`,
      passwordHash: "x",
      name: naam,
      handle: `${naam}-${stempel}`,
    },
    select: { id: true },
  });
  opgeruimd.push(user.id);
  return user.id;
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: opgeruimd } } });
});

describe("getFriends", () => {
  it("geeft de ander terug, van welke kant de vriendschap ook staat", async () => {
    const anna = await maakGebruiker("anna");
    const bram = await maakGebruiker("bram");
    const cato = await maakGebruiker("cato");

    // Anna staat bewust één keer links en één keer rechts in de tabel: allebei
    // de kanten moeten Anna zelf overslaan en de ander teruggeven.
    await prisma.friendship.create({ data: { aId: anna, bId: bram } });
    await prisma.friendship.create({ data: { aId: cato, bId: anna } });

    const vanAnna = await getFriends(anna);
    expect(vanAnna.map((vriend) => vriend.id).sort()).toEqual(
      [bram, cato].sort(),
    );
    expect(vanAnna.some((vriend) => vriend.id === anna)).toBe(false);
    expect(vanAnna.every((vriend) => vriend.handle.length > 0)).toBe(true);

    expect((await getFriends(bram)).map((vriend) => vriend.id)).toEqual([anna]);
    expect((await getFriends(cato)).map((vriend) => vriend.id)).toEqual([anna]);
  });

  it("geeft een lege lijst als je nog niemand hebt", async () => {
    expect(await getFriends(await maakGebruiker("eenling"))).toEqual([]);
  });
});

describe("getListInvites", () => {
  it("noemt de naam van wie je hebt gevraagd", async () => {
    const eigenaar = await maakGebruiker("gastheer");
    const gast = await maakGebruiker("gast");
    await prisma.friendship.create({ data: { aId: eigenaar, bId: gast } });

    const lijst = await prisma.list.create({
      data: { userId: eigenaar, title: "Feest", shareCode: `feest-${stempel}` },
      select: { id: true },
    });

    expect(await getListInvites(lijst.id)).toEqual([]);

    expect(await inviteToList(eigenaar, lijst.id, gast)).toBe("sent");
    const uitnodigingen = await getListInvites(lijst.id);
    expect(uitnodigingen).toHaveLength(1);
    expect(uitnodigingen[0].userId).toBe(gast);
    expect(uitnodigingen[0].name).toBe("gast");
  });
});

describe("getVisitorListTitle", () => {
  it("geeft de titel voor een deelbare lijst, en zwijgt over de rest", async () => {
    const eigenaar = await maakGebruiker("deler");

    async function maakLijst(visibility: Visibility, code: string) {
      await prisma.list.create({
        data: {
          userId: eigenaar,
          title: `Lijst ${code}`,
          shareCode: `${code}-${stempel}`,
          visibility,
        },
      });
      return `${code}-${stempel}`;
    }

    const metLink = await maakLijst("LINK", "link");
    const gevonden = await getVisitorListTitle(metLink);
    expect(gevonden?.title).toBe("Lijst link");
    expect(gevonden?.ownerName).toBe("deler");

    expect(await getVisitorListTitle(await maakLijst("PUBLIC", "open"))).not.toBeNull();

    // Een privélijst en een vriendenlijst mogen hun titel niet langs de
    // voordeur prijsgeven: getListForVisitor doet dat ook niet.
    expect(await getVisitorListTitle(await maakLijst("PRIVATE", "prive"))).toBeNull();
    expect(await getVisitorListTitle(await maakLijst("FRIENDS", "vrienden"))).toBeNull();

    expect(await getVisitorListTitle("bestaat-niet")).toBeNull();
  });
});
