import "server-only";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * Samen aan één lijst werken.
 *
 * De eigenaar staat niet in ListMember — dat is `List.userId`. Deelnemers mogen
 * alles met de cadeaus, maar de instellingen van de lijst blijven van de
 * eigenaar: die gelden immers voor iedereen die meedoet.
 */

/** Inclusief de eigenaar. Meer dan dit wordt onoverzichtelijk. */
export const MAX_MEMBERS = 10;

const PROFILE = {
  id: true,
  name: true,
  handle: true,
  avatarUrl: true,
  bio: true,
} as const;

export type Participant = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  bio: string | null;
  isOwner: boolean;
};

/** Mag deze gebruiker cadeaus in deze lijst beheren? */
export async function canEditList(userId: string, listId: string) {
  const list = await prisma.list.findFirst({
    where: {
      id: listId,
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });
  return Boolean(list);
}

export async function isListOwner(userId: string, listId: string) {
  const list = await prisma.list.findFirst({
    where: { id: listId, userId },
    select: { id: true },
  });
  return Boolean(list);
}

/** De eigenaar voorop, daarna de deelnemers op volgorde van toetreden. */
export async function getParticipants(listId: string): Promise<Participant[]> {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: {
      user: { select: PROFILE },
      members: {
        orderBy: { createdAt: "asc" },
        select: { user: { select: PROFILE } },
      },
    },
  });
  if (!list) return [];

  return [
    { ...list.user, isOwner: true },
    ...list.members.map((member) => ({ ...member.user, isOwner: false })),
  ];
}

async function countParticipants(listId: string) {
  return (await prisma.listMember.count({ where: { listId } })) + 1;
}

export type InviteResult = "sent" | "full" | "already" | "not-owner" | "unknown";

/** Alleen de eigenaar nodigt uit, en alleen mensen die hij als vriend heeft. */
export async function inviteToList(
  ownerId: string,
  listId: string,
  toId: string,
): Promise<InviteResult> {
  if (!(await isListOwner(ownerId, listId))) return "not-owner";
  if (ownerId === toId) return "already";

  const member = await prisma.listMember.findUnique({
    where: { listId_userId: { listId, userId: toId } },
    select: { id: true },
  });
  if (member) return "already";

  if ((await countParticipants(listId)) >= MAX_MEMBERS) return "full";

  const exists = await prisma.user.findUnique({
    where: { id: toId },
    select: { id: true },
  });
  if (!exists) return "unknown";

  await prisma.listInvite.upsert({
    where: { listId_toId: { listId, toId } },
    create: { listId, toId },
    update: {},
  });
  return "sent";
}

export async function getListInvitesFor(userId: string) {
  return prisma.listInvite.findMany({
    where: { toId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      list: {
        select: {
          id: true,
          title: true,
          coverColor: true,
          occasion: true,
          user: { select: { name: true, handle: true, avatarUrl: true } },
        },
      },
    },
  });
}

/** Meedoen. Geeft terug of het gelukt is, en zo niet waarom. */
export async function joinList(
  userId: string,
  listId: string,
): Promise<"joined" | "full" | "already" | "unknown"> {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: { userId: true },
  });
  if (!list) return "unknown";
  if (list.userId === userId) return "already";

  const member = await prisma.listMember.findUnique({
    where: { listId_userId: { listId, userId } },
    select: { id: true },
  });
  if (member) return "already";

  if ((await countParticipants(listId)) >= MAX_MEMBERS) return "full";

  await prisma.$transaction([
    prisma.listMember.create({ data: { listId, userId } }),
    prisma.listInvite.deleteMany({ where: { listId, toId: userId } }),
  ]);
  return "joined";
}

export async function acceptListInvite(userId: string, inviteId: string) {
  const invite = await prisma.listInvite.findUnique({
    where: { id: inviteId },
    select: { listId: true, toId: true },
  });
  if (!invite || invite.toId !== userId) return "unknown" as const;
  return joinList(userId, invite.listId);
}

/** Weigeren of, als eigenaar, weer intrekken. */
export async function removeListInvite(userId: string, inviteId: string) {
  await prisma.listInvite.deleteMany({
    where: {
      id: inviteId,
      OR: [{ toId: userId }, { list: { userId } }],
    },
  });
}

/** Zelf weggaan, of door de eigenaar eruit gezet worden. */
export async function removeMember(
  actorId: string,
  listId: string,
  userId: string,
) {
  if (actorId !== userId && !(await isListOwner(actorId, listId))) return;
  await prisma.listMember.deleteMany({ where: { listId, userId } });
}

/** De code achter de link om mee te doen; pas aangemaakt bij gebruik. */
export async function getCollabCode(ownerId: string, listId: string) {
  const list = await prisma.list.findFirst({
    where: { id: listId, userId: ownerId },
    select: { collabCode: true },
  });
  if (!list) return null;
  if (list.collabCode) return list.collabCode;

  const code = randomBytes(9).toString("base64url");
  await prisma.list.update({ where: { id: listId }, data: { collabCode: code } });
  return code;
}

export async function findByCollabCode(code: string) {
  if (!code) return null;
  return prisma.list.findUnique({
    where: { collabCode: code },
    select: {
      id: true,
      title: true,
      coverColor: true,
      occasion: true,
      user: { select: { id: true, name: true, handle: true, avatarUrl: true } },
      _count: { select: { members: true } },
    },
  });
}
