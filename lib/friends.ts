import "server-only";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * Vrienden.
 *
 * Een vriendschap is wederzijds en staat daarom één keer in de tabel, met de
 * twee id's in een vaste volgorde. Dat scheelt dubbele rijen en maakt "zijn
 * deze twee vrienden?" een enkele opzoekactie.
 */

/** De vaste volgorde waarin een stel in de tabel staat. */
function pair(one: string, two: string) {
  return one < two ? { aId: one, bId: two } : { aId: two, bId: one };
}

export async function areFriends(one: string, two: string) {
  if (one === two) return true;
  const found = await prisma.friendship.findUnique({
    where: { aId_bId: pair(one, two) },
    select: { id: true },
  });
  return Boolean(found);
}

const PROFILE = {
  id: true,
  name: true,
  handle: true,
  avatarUrl: true,
  bio: true,
} as const;

export type FriendProfile = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  bio: string | null;
};

export async function getFriends(userId: string): Promise<FriendProfile[]> {
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ aId: userId }, { bId: userId }] },
    orderBy: { createdAt: "desc" },
    select: { a: { select: PROFILE }, b: { select: PROFILE } },
  });

  return rows.map((row) => (row.a.id === userId ? row.b : row.a));
}

export async function getIncomingRequests(userId: string) {
  return prisma.friendRequest.findMany({
    where: { toId: userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, from: { select: PROFILE } },
  });
}

export async function getOutgoingRequests(userId: string) {
  return prisma.friendRequest.findMany({
    where: { fromId: userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, to: { select: PROFILE } },
  });
}

/** Hoe jij tegenover iemand anders staat. */
export type Relation = "self" | "friends" | "sent" | "received" | "none";

export async function relationTo(
  userId: string,
  otherId: string,
): Promise<Relation> {
  if (userId === otherId) return "self";
  if (await areFriends(userId, otherId)) return "friends";

  const requests = await prisma.friendRequest.findMany({
    where: {
      OR: [
        { fromId: userId, toId: otherId },
        { fromId: otherId, toId: userId },
      ],
    },
    select: { fromId: true },
  });

  if (requests.some((request) => request.fromId === userId)) return "sent";
  if (requests.length > 0) return "received";
  return "none";
}

/**
 * Zoeken op profielnaam of naam. Bewust geen e-mailadressen: je vindt iemand
 * met wat diegene zelf op zijn profiel heeft gezet, niet met wat hij bij het
 * inloggen gebruikt.
 */
export async function searchPeople(userId: string, query: string) {
  const term = query.trim();
  if (term.length < 2) return [];

  const people = await prisma.user.findMany({
    where: {
      id: { not: userId },
      OR: [
        { handle: { contains: term, mode: "insensitive" } },
        { name: { contains: term, mode: "insensitive" } },
      ],
    },
    orderBy: { handle: "asc" },
    take: 10,
    select: PROFILE,
  });

  return Promise.all(
    people.map(async (person) => ({
      ...person,
      relation: await relationTo(userId, person.id),
    })),
  );
}

/**
 * Stuurt een uitnodiging. Had de ander er al een naar jou gestuurd, dan zijn
 * jullie meteen vrienden — anders zouden twee mensen die elkaar tegelijk
 * uitnodigen op elkaar blijven wachten.
 */
export async function sendRequest(fromId: string, toId: string) {
  if (fromId === toId) return "self" as const;
  if (await areFriends(fromId, toId)) return "friends" as const;

  const reverse = await prisma.friendRequest.findUnique({
    where: { fromId_toId: { fromId: toId, toId: fromId } },
    select: { id: true },
  });
  if (reverse) {
    await acceptRequest(fromId, reverse.id);
    return "friends" as const;
  }

  await prisma.friendRequest.upsert({
    where: { fromId_toId: { fromId, toId } },
    create: { fromId, toId },
    update: {},
  });
  return "sent" as const;
}

/** Accepteren mag alleen degene aan wie de uitnodiging gericht is. */
export async function acceptRequest(userId: string, requestId: string) {
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
    select: { fromId: true, toId: true },
  });
  if (!request || request.toId !== userId) return false;

  await prisma.$transaction([
    prisma.friendship.upsert({
      where: { aId_bId: pair(request.fromId, request.toId) },
      create: pair(request.fromId, request.toId),
      update: {},
    }),
    prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { fromId: request.fromId, toId: request.toId },
          { fromId: request.toId, toId: request.fromId },
        ],
      },
    }),
  ]);
  return true;
}

/** Weigeren of zelf intrekken: allebei gewoon de uitnodiging weghalen. */
export async function removeRequest(userId: string, requestId: string) {
  await prisma.friendRequest.deleteMany({
    where: { id: requestId, OR: [{ toId: userId }, { fromId: userId }] },
  });
}

export async function removeFriend(userId: string, otherId: string) {
  await prisma.friendship.deleteMany({ where: pair(userId, otherId) });
}

/**
 * De code achter je uitnodigingslink. We maken hem pas aan als je hem nodig
 * hebt, zodat bestaande accounts er niet zonder komen te zitten.
 */
export async function getInviteCode(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { inviteCode: true },
  });
  if (user?.inviteCode) return user.inviteCode;

  const code = randomBytes(9).toString("base64url");
  await prisma.user.update({ where: { id: userId }, data: { inviteCode: code } });
  return code;
}

export async function findByInviteCode(code: string) {
  if (!code) return null;
  return prisma.user.findUnique({ where: { inviteCode: code }, select: PROFILE });
}
