"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  findFreeHandle,
  hashPassword,
  isReservedHandle,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import {
  loginSchema,
  passwordChangeSchema,
  profileSchema,
  registerSchema,
} from "@/lib/validation";
import { setLocaleCookie } from "@/lib/i18n/server";

export type FormState = { error?: string; success?: string };

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "invalid" };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (existing) return { error: "email-taken" };

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash: await hashPassword(parsed.data.password),
      handle: await findFreeHandle(parsed.data.name),
    },
    select: { id: true },
  });

  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalid-credentials" };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, passwordHash: true, locale: true },
  });
  // Altijd hashen vergelijken, ook als de gebruiker niet bestaat, zodat de
  // responstijd niet verklapt of een e-mailadres bekend is.
  const hash =
    user?.passwordHash ??
    "$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ012";
  const valid = await verifyPassword(parsed.data.password, hash);
  if (!user || !valid) return { error: "invalid-credentials" };

  await createSession(user.id);
  await setLocaleCookie(user.locale === "en" ? "en" : "nl");
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    handle: formData.get("handle"),
    locale: formData.get("locale"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "invalid" };
  }
  if (isReservedHandle(parsed.data.handle)) return { error: "handle-taken" };

  const clash = await prisma.user.findUnique({
    where: { handle: parsed.data.handle },
    select: { id: true },
  });
  if (clash && clash.id !== user.id) return { error: "handle-taken" };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      handle: parsed.data.handle,
      locale: parsed.data.locale,
    },
  });
  await setLocaleCookie(parsed.data.locale);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: "saved" };
}

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const sessionUser = await requireUser();
  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "invalid" };
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { passwordHash: true },
  });
  if (!user) return { error: "invalid-credentials" };

  const valid = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash,
  );
  if (!valid) return { error: "wrong-password" };

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  return { success: "password-changed" };
}
