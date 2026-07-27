import "server-only";

import { prisma } from "@/lib/db";

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

function clampPriority(value: number | undefined) {
  if (!value || Number.isNaN(value)) return 2;
  return Math.min(3, Math.max(1, Math.round(value)));
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
} as const;

/** Lijst inclusief cadeaus voor de eigenaar — zonder ook maar één claim-veld. */
export async function getListForOwner(userId: string, listId: string) {
  return prisma.list.findFirst({
    where: { id: listId, userId },
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
      user: { select: { name: true, handle: true } },
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
) {
  const list = await prisma.list.findFirst({
    where: { id: listId, userId },
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
    where: { id: giftId, list: { userId } },
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
    where: { id: giftId, list: { userId } },
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
    where: { id: listId, userId },
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
