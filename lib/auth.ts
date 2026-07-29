import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { normalizeHandle } from "@/lib/validation";

export { normalizeHandle };

const SESSION_COOKIE = "wenslijst_session";
const SESSION_DAYS = 30;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error(
      "AUTH_SECRET is niet ingesteld. Zie .env.example voor uitleg.",
    );
  }
  return new TextEncoder().encode(value);
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** Zet het inlog-cookie voor deze gebruiker. */
export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

async function currentUserId() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  handle: string;
  locale: string;
  avatarUrl: string | null;
  bio: string | null;
};

/** De ingelogde gebruiker, of null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const id = await currentUserId();
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      handle: true,
      locale: true,
      avatarUrl: true,
      bio: true,
    },
  });
  return user;
}

/** Zelfde als getCurrentUser, maar gooit als er niemand is ingelogd. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Je moet ingelogd zijn.");
  }
  return user;
}

export class AuthError extends Error {}

const HANDLE_RESERVED = new Set([
  "api",
  "app",
  "dashboard",
  "l",
  "u",
  "login",
  "logout",
  "register",
  "settings",
  "admin",
  "new",
  "lists",
  "uploads",
  "static",
  "account",
]);

export function isReservedHandle(handle: string) {
  return HANDLE_RESERVED.has(handle);
}

/** Zoekt een vrije handle op basis van een gewenste waarde. */
export async function findFreeHandle(desired: string) {
  const base = normalizeHandle(desired) || "wenslijst";
  let candidate = isReservedHandle(base) ? `${base}-1` : base;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { handle: candidate } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}
