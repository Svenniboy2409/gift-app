"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isLocale } from "@/lib/i18n";
import { setLocaleCookie } from "@/lib/i18n/server";

/** Taal wisselen. Voor ingelogde gebruikers onthouden we het ook in het profiel. */
export async function switchLocaleAction(formData: FormData) {
  const value = formData.get("locale");
  if (!isLocale(value)) return;

  await setLocaleCookie(value);

  const user = await getCurrentUser();
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { locale: value },
    });
  }

  revalidatePath("/", "layout");
}
