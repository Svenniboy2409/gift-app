import "server-only";

import { prisma } from "@/lib/db";
import { areFriends } from "@/lib/friends";

/**
 * Wie mag er aan de cadeaus van een lijst komen: de eigenaar, en iedereen die
 * hij heeft uitgenodigd om mee te doen.
 */
function editableBy(userId: string) {
  return { OR: [{ userId }, { members: { some: { userId } } }] };
}

/**
 * BELANGRIJK — de verrassing bewaken.
 *
 * Dit bestand kent twee manieren om een lijst op te halen:
 *
 *   getListForOwner()   selecteert NOOIT iets uit de Claim-tabel. De eigenaar
 *                       kan dus onmogelijk zien wat er al gekocht is, ook niet
 *                       via de netwerk-tab of een API-antwoord.
 *   getListForVisitor() geeft wél de claim-status terug, want daar is de
 *                       functie voor bedoeld: dubbel kopen voorkomen.
 *
 * Voeg claim-velden dus nooit toe aan de owner-variant.
 */

export type GiftInput = {
  title: string;
  description?: string | null;
  note?: string | null;
  priceCents?: number | null;
  currency?: string;
  url?: string | null;
  merchant?: string | null;
  imageUrl?: string | null;
  priority?: number;
  quantity?: number;
};

/** Hoe graag je iets wilt: 1 tot 5 sterren, met 3 als middenweg. */
function clampPriority(value: number | undefined) {
  if (!value || Number.isNaN(value)) return 3;
  return Math.min(5, Math.max(1, Math.round(value)));
}

function clampQuantity(value: number | undefined) {
  if (!value || Number.isNaN(value)) return 1;
  return Math.min(99, Math.max(1, Math.round(value)));
}

const ownerGiftSelect = {
  id: true,
  title: true,
  description: true,
  note: true,
  priceCents: true,
  currency: true,
  url: true,
  merchant: true,
  imageUrl: true,
  priority: true,
  quantity: true,
  position: true,
  groupId: true,
} as const;

/** Lijst inclusief cadeaus voor de eigenaar — zonder ook maar één claim-veld. */
/** De lijst zoals de eigenaar én de mensen die meedoen hem zien. */
export async function getListForOwner(userId: string, listId: string) {
  return prisma.list.findFirst({
    where: { id: listId, ...editableBy(userId) },
    select: {
      id: true,
      title: true,
      description: true,
      occasion: true,
      eventDate: true,
      coverColor: true,
      visibility: true,
      shareCode: true,
      gifts: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: ownerGiftSelect,
      },
    },
  });
}

export type VisitorGift = {
  id: string;
  title: string;
  description: string | null;
  note: string | null;
  priceCents: number | null;
  currency: string;
  url: string | null;
  merchant: string | null;
  imageUrl: string | null;
  priority: number;
  quantity: number;
  claimedCount: number;
  claimedByOthers: { name: string }[];
  myClaim: { id: string; quantity: number } | null;
};

export type VisitorList = {
  id: string;
  title: string;
  description: string | null;
  occasion: string;
  eventDate: Date | null;
  coverColor: string;
  shareCode: string;
  ownerName: string;
  ownerHandle: string;
  /** Iedereen die aan de lijst werkt, met de eigenaar voorop. */
  participants: { name: string; handle: string }[];
  gifts: VisitorGift[];
};

/**
 * Lijst zoals een bezoeker hem ziet: mét claim-informatie.
 * `claimerToken` komt uit het cookie van de bezoeker en bepaalt welke claims
 * "van mij" zijn.
 */
export async function getListForVisitor(
  shareCode: string,
  claimerToken: string | null,
  /** Wie er kijkt, als diegene is ingelogd. Nodig voor vriendenlijsten. */
  viewerId?: string | null,
): Promise<VisitorList | null> {
  const list = await prisma.list.findUnique({
    where: { shareCode },
    select: {
      id: true,
      title: true,
      description: true,
      occasion: true,
      eventDate: true,
      coverColor: true,
      shareCode: true,
      visibility: true,
      userId: true,
      user: { select: { name: true, handle: true } },
      members: {
        orderBy: { createdAt: "asc" },
        select: { user: { select: { name: true, handle: true } } },
      },
      gifts: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          ...ownerGiftSelect,
          claims: {
            select: {
              id: true,
              claimerName: true,
              claimerToken: true,
              quantity: true,
            },
          },
        },
      },
    },
  });

  if (!list || list.visibility === "PRIVATE") return null;

  // Een vriendenlijst opent alleen voor de eigenaar zelf en voor zijn vrienden;
  // de deel-link is daar dus niet genoeg.
  if (list.visibility === "FRIENDS") {
    if (!viewerId) return null;
    if (!(await areFriends(viewerId, list.userId))) return null;
  }

  return {
    id: list.id,
    title: list.title,
    description: list.description,
    occasion: list.occasion,
    eventDate: list.eventDate,
    coverColor: list.coverColor,
    shareCode: list.shareCode,
    ownerName: list.user.name,
    ownerHandle: list.user.handle,
    // Iedereen die aan de lijst werkt; de eigenaar voorop.
    participants: [
      { name: list.user.name, handle: list.user.handle },
      ...list.members.map((member) => member.user),
    ],
    gifts: list.gifts.map((gift) => {
      const mine = claimerToken
        ? gift.claims.find((claim) => claim.claimerToken === claimerToken)
        : undefined;
      return {
        id: gift.id,
        title: gift.title,
        description: gift.description,
        note: gift.note,
        priceCents: gift.priceCents,
        currency: gift.currency,
        url: gift.url,
        merchant: gift.merchant,
        imageUrl: gift.imageUrl,
        priority: gift.priority,
        quantity: gift.quantity,
        claimedCount: gift.claims.reduce((sum, c) => sum + c.quantity, 0),
        claimedByOthers: gift.claims
          .filter((claim) => claim.id !== mine?.id)
          .map((claim) => ({ name: claim.claimerName })),
        myClaim: mine ? { id: mine.id, quantity: mine.quantity } : null,
      };
    }),
  };
}

export async function createGift(
  userId: string,
  listId: string,
  input: GiftInput,
  /** Hoort dit cadeau bij exemplaren in andere lijsten? Dan delen ze deze code. */
  groupId?: string,
) {
  const list = await prisma.list.findFirst({
    where: { id: listId, ...editableBy(userId) },
    select: { id: true },
  });
  if (!list) return null;

  const last = await prisma.gift.findFirst({
    where: { listId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  return prisma.gift.create({
    data: {
      listId,
      title: input.title,
      description: input.description ?? null,
      note: input.note ?? null,
      priceCents: input.priceCents ?? null,
      currency: input.currency ?? "EUR",
      url: input.url ?? null,
      merchant: input.merchant ?? null,
      imageUrl: input.imageUrl ?? null,
      priority: clampPriority(input.priority),
      quantity: clampQuantity(input.quantity),
      position: (last?.position ?? -1) + 1,
      ...(groupId ? { groupId } : {}),
    },
    select: ownerGiftSelect,
  });
}

export async function updateGift(
  userId: string,
  giftId: string,
  input: GiftInput,
) {
  const owned = await prisma.gift.findFirst({
    where: { id: giftId, list: editableBy(userId) },
    select: { id: true },
  });
  if (!owned) return null;

  return prisma.gift.update({
    where: { id: giftId },
    data: {
      title: input.title,
      description: input.description ?? null,
      note: input.note ?? null,
      priceCents: input.priceCents ?? null,
      currency: input.currency ?? "EUR",
      url: input.url ?? null,
      merchant: input.merchant ?? null,
      imageUrl: input.imageUrl ?? null,
      priority: clampPriority(input.priority),
      quantity: clampQuantity(input.quantity),
    },
    select: ownerGiftSelect,
  });
}

export async function deleteGift(userId: string, giftId: string) {
  const result = await prisma.gift.deleteMany({
    where: { id: giftId, list: editableBy(userId) },
  });
  return result.count > 0;
}

/** Nieuwe volgorde na slepen. `ids` is de volledige lijst in de gewenste volgorde. */
export async function reorderGifts(
  userId: string,
  listId: string,
  ids: string[],
) {
  const list = await prisma.list.findFirst({
    where: { id: listId, ...editableBy(userId) },
    select: { id: true },
  });
  if (!list) return false;

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.gift.updateMany({
        where: { id, listId },
        data: { position: index },
      }),
    ),
  );
  return true;
}

/**
 * In welke lijsten staat elk van deze cadeaus?
 *
 * Een cadeau in twee lijsten is twee rijen die dezelfde `groupId` delen. We
 * kijken alleen naar lijsten waar deze gebruiker aan mag werken: staat hetzelfde
 * cadeau ook in de lijst van iemand anders, dan gaat hem dat niet aan.
 */
export async function getGiftListIds(userId: string, groupIds: string[]) {
  if (groupIds.length === 0) return {};

  const rows = await prisma.gift.findMany({
    where: { groupId: { in: groupIds }, list: editableBy(userId) },
    select: { groupId: true, listId: true },
  });

  const map: Record<string, string[]> = {};
  for (const row of rows) {
    (map[row.groupId] ??= []).push(row.listId);
  }
  return map;
}

/**
 * Zet een cadeau in precies deze lijsten. Lijsten die erbij komen krijgen een
 * eigen exemplaar met dezelfde gegevens; lijsten die afvallen raken het hunne
 * kwijt. Minstens één lijst blijft over — helemaal nergens meer in staan is
 * verwijderen, en dat gaat via de prullenbak.
 */
export async function setGiftLists(
  userId: string,
  giftId: string,
  listIds: string[],
): Promise<"saved" | "none" | "unknown"> {
  if (listIds.length === 0) return "none";

  const gift = await prisma.gift.findFirst({
    where: { id: giftId, list: editableBy(userId) },
    select: { ...ownerGiftSelect, groupId: true },
  });
  if (!gift) return "unknown";

  // Alleen lijsten waar je zelf aan mag werken; de rest negeren we stil.
  const allowed = await prisma.list.findMany({
    where: { id: { in: listIds }, ...editableBy(userId) },
    select: { id: true },
  });
  if (allowed.length === 0) return "none";

  const wanted = new Set(allowed.map((list) => list.id));
  const current = await prisma.gift.findMany({
    where: { groupId: gift.groupId, list: editableBy(userId) },
    select: { id: true, listId: true },
  });

  const weg = current.filter((row) => !wanted.has(row.listId));
  // Alles weghalen zou het cadeau laten verdwijnen; dat is niet de bedoeling.
  if (weg.length === current.length) return "none";

  for (const row of weg) {
    await prisma.gift.delete({ where: { id: row.id } });
  }

  const bestaand = new Set(current.map((row) => row.listId));
  for (const listId of wanted) {
    if (bestaand.has(listId)) continue;
    await createGift(userId, listId, gift, gift.groupId);
  }

  return "saved";
}
