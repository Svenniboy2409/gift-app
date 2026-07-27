import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const CLAIMER_COOKIE = "wenslijst_claimer";
const CLAIMER_NAME_COOKIE = "wenslijst_claimer_name";
const ONE_YEAR = 365 * 24 * 60 * 60;

/** Het anonieme token van deze bezoeker, als hij er al een heeft. */
export async function readClaimerToken() {
  const store = await cookies();
  return store.get(CLAIMER_COOKIE)?.value ?? null;
}

/** De laatst gebruikte naam van deze bezoeker, om het formulier voor te vullen. */
export async function readClaimerName() {
  const store = await cookies();
  const value = store.get(CLAIMER_NAME_COOKIE)?.value;
  return value ? decodeURIComponent(value) : null;
}

/** Haalt het token op of maakt er een aan en zet het cookie. */
export async function ensureClaimerToken() {
  const store = await cookies();
  const existing = store.get(CLAIMER_COOKIE)?.value;
  if (existing) return existing;

  const token = randomBytes(24).toString("base64url");
  store.set(CLAIMER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return token;
}

async function rememberClaimerName(name: string) {
  const store = await cookies();
  store.set(CLAIMER_NAME_COOKIE, encodeURIComponent(name), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

export type ClaimResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "already-claimed" | "sold-out" };

/**
 * Claimt (een deel van) een cadeau. Er wordt gecontroleerd of er nog
 * exemplaren over zijn; de lijst mag niet privé zijn.
 */
export async function claimGift(
  giftId: string,
  claimerName: string,
  quantity: number,
): Promise<ClaimResult> {
  const token = await ensureClaimerToken();

  const gift = await prisma.gift.findFirst({
    where: { id: giftId, list: { visibility: { in: ["LINK", "PUBLIC"] } } },
    select: {
      id: true,
      quantity: true,
      claims: { select: { claimerToken: true, quantity: true } },
    },
  });
  if (!gift) return { ok: false, reason: "not-found" };

  if (gift.claims.some((claim) => claim.claimerToken === token)) {
    return { ok: false, reason: "already-claimed" };
  }

  const taken = gift.claims.reduce((sum, claim) => sum + claim.quantity, 0);
  const available = gift.quantity - taken;
  if (available <= 0) return { ok: false, reason: "sold-out" };

  const wanted = Math.min(Math.max(1, Math.round(quantity)), available);
  await prisma.claim.create({
    data: { giftId, claimerName, claimerToken: token, quantity: wanted },
  });
  await rememberClaimerName(claimerName);

  return { ok: true };
}

/** Trekt de eigen claim weer in. Alleen mogelijk met het eigen token. */
export async function releaseClaim(giftId: string) {
  const token = await readClaimerToken();
  if (!token) return false;
  const result = await prisma.claim.deleteMany({
    where: { giftId, claimerToken: token },
  });
  return result.count > 0;
}
