"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  createList,
  deleteList,
  isCoverColor,
  regenerateShareCode,
  updateList,
} from "@/lib/lists";
import { listSchema } from "@/lib/validation";
import type { FormState } from "@/lib/actions/auth";

function readListForm(formData: FormData) {
  return listSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    occasion: formData.get("occasion") ?? "OTHER",
    eventDate: formData.get("eventDate") ?? "",
    coverColor: formData.get("coverColor") ?? "terracotta",
    visibility: formData.get("visibility") ?? "LINK",
  });
}

function toDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createListAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = readListForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "invalid" };
  }

  const list = await createList(user.id, {
    title: parsed.data.title,
    description: parsed.data.description || null,
    occasion: parsed.data.occasion,
    eventDate: toDate(parsed.data.eventDate),
    coverColor: isCoverColor(parsed.data.coverColor)
      ? parsed.data.coverColor
      : "terracotta",
    visibility: parsed.data.visibility,
  });

  revalidatePath("/dashboard");
  redirect(`/lists/${list.id}`);
}

export async function updateListAction(
  listId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = readListForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "invalid" };
  }

  const ok = await updateList(user.id, listId, {
    title: parsed.data.title,
    description: parsed.data.description || null,
    occasion: parsed.data.occasion,
    eventDate: toDate(parsed.data.eventDate),
    coverColor: isCoverColor(parsed.data.coverColor)
      ? parsed.data.coverColor
      : "terracotta",
    visibility: parsed.data.visibility,
  });
  if (!ok) return { error: "generic" };

  revalidatePath(`/lists/${listId}`);
  revalidatePath("/dashboard");
  return { success: "saved" };
}

export async function deleteListAction(formData: FormData) {
  const user = await requireUser();
  const listId = String(formData.get("listId") ?? "");
  if (!listId) return;
  await deleteList(user.id, listId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function regenerateShareCodeAction(formData: FormData) {
  const user = await requireUser();
  const listId = String(formData.get("listId") ?? "");
  if (!listId) return;
  await regenerateShareCode(user.id, listId);
  revalidatePath(`/lists/${listId}`);
  revalidatePath("/dashboard");
}
