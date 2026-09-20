import "server-only";

import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/db";
import { areFriends } from "@/lib/friends";
import { COVER_COLORS, isCoverColor } from "@/lib/covers";

export { COVER_COLORS, isCoverColor };
export type { CoverColor } from "@/lib/covers";
import type { Occasion, Visibility } from "@/lib/generated/prisma/enums";

/**
 * Deel-codes: 10 tekens uit een alfabet zonder makkelijk te verwarren
 * karakters (geen 0/O/1/l/I). Dat is ~55 bits entropie — niet te raden.
 */
const makeShareCode = customAlphabet(
  "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ",
  10,
);


export type ListInput = {
  title: string;
  description?: string | null;
  occasion?: Occasion;
  /** Bij "Anders": wat de gelegenheid dan wél is. */
  occasionNote?: string | null;
  eventDate?: Date | null;
  coverColor?: string;
  visibility?: Visibility;
};

export async function createList(userId: string, input: ListInput) {
  const last = await prisma.list.findFirst({
    where: { userId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  return prisma.list.create({
    data: {
      userId,
      title: input.title,
      description: input.description ?? null,
      occasion: input.occasion ?? "OTHER",
      occasionNote: input.occasionNote || null,
      eventDate: input.eventDate ?? null,
      coverColor: input.coverColor ?? "terracotta",
      visibility: input.visibility ?? "LINK",
      shareCode: makeShareCode(),
      position: (last?.position ?? -1) + 1,
    },
  });
}

export async function updateList(
  userId: string,
  listId: string,
  input: ListInput,
) {
  const result = await prisma.list.updateMany({
    where: { id: listId, userId },
    data: {
      title: input.title,
      description: input.description ?? null,
      occasion: input.occasion,
      occasionNote: input.occasionNote || null,
      eventDate: input.eventDate ?? null,
      coverColor: input.coverColor,
      visibility: input.visibility,
    },
  });
  return result.count > 0;
}

export async function deleteList(userId: string, listId: string) {
  const result = await prisma.list.deleteMany({ where: { id: listId, userId } });
  return result.count > 0;
}

/** Nieuwe deel-code: de oude link werkt daarna niet meer. */
export async function regenerateShareCode(userId: string, listId: string) {
  const owned = await prisma.list.findFirst({
    where: { id: listId, userId },
    select: { id: true },
  });
  if (!owned) return null;
  const updated = await prisma.list.update({
    where: { id: listId },
    data: { shareCode: makeShareCode() },
    select: { shareCode: true },
  });
  return updated.shareCode;
}

/**
 * Alle lijsten waar je bij hoort — die van jezelf én die waar je samen met
 * iemand anders aan werkt.
 */
export async function getListsForOwner(userId: string) {
  const lists = await prisma.list.findMany({
    where: { OR: [{ userId }, { members: { some: { userId } } }] },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      occasion: true,
      occasionNote: true,
      eventDate: true,
      coverColor: true,
      visibility: true,
      shareCode: true,
      createdAt: true,
      /** Van jou, of doe je alleen mee? Dat scheelt in wat je mag. */
      userId: true,
      /** Alleen je eigen deelname; hooguit één rij. */
      members: { where: { userId }, select: { hiddenOnProfile: true } },
      _count: { select: { gifts: true } },
    },
  });

  return lists.map(({ members, ...list }) => ({
    ...list,
    /** Meegedaan, maar van je eigen profiel gehaald. */
    hiddenOnMyProfile: members[0]?.hiddenOnProfile ?? false,
  }));
}

/**
 * Alleen de namen, voor het keuzelijstje in de schuifpanelen. Die staan in de
 * layout, dus dit draait bij élke pagina — de volledige lijsten met hun
 * omschrijving en aantallen zijn daar zonde van de tijd.
 */
export async function getListTitles(userId: string) {
  return prisma.list.findMany({
    where: { OR: [{ userId }, { members: { some: { userId } } }] },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true },
  });
}

/**
 * De lijsten die op een profiel horen (`/u/<handle>`).
 *
 * Dat zijn niet alleen de lijsten van die persoon zelf, maar ook de lijsten
 * waar hij samen met iemand anders aan werkt — die staan op ieders profiel,
 * tenzij een deelnemer hem van zijn eigen profiel heeft gehaald. Vrienden zien
 * er de vriendenlijsten bij.
 */
/**
 * Alleen de naam, voor de titelbalk. Zie de uitleg bij getVisitorListTitle:
 * generateMetadata is een eigen rendering, dus het volledige profiel ophalen
 * betekende alles twee keer doen.
 */
export async function getProfileName(handle: string) {
  const user = await prisma.user.findUnique({
    where: { handle },
    select: { name: true },
  });
  return user?.name ?? null;
}

export async function getPublicProfile(
  handle: string,
  /** Wie er kijkt, als diegene is ingelogd. Vrienden zien meer. */
  viewerId?: string | null,
) {
  const user = await prisma.user.findUnique({
    where: { handle },
    select: { id: true, name: true, handle: true, avatarUrl: true, bio: true },
  });
  if (!user) return null;

  const friend = viewerId ? await areFriends(viewerId, user.id) : false;

  const lists = await prisma.list.findMany({
    where: {
      OR: [
        { userId: user.id },
        { members: { some: { userId: user.id, hiddenOnProfile: false } } },
      ],
      visibility: friend ? { in: ["PUBLIC", "FRIENDS"] } : "PUBLIC",
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      title: true,
      description: true,
      occasion: true,
      occasionNote: true,
      eventDate: true,
      coverColor: true,
      shareCode: true,
      visibility: true,
      _count: { select: { gifts: true } },
    },
  });

  return { ...user, viewerIsFriend: friend, lists };
}
