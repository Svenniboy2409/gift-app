"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createGift, deleteGift, reorderGifts, updateGift } from "@/lib/gifts";
import { giftSchema, parsePriceInput } from "@/lib/validation";
import type { FormState } from "@/lib/actions/auth";

function readGiftForm(formData: FormData) {
  return giftSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    note: formData.get("note") ?? "",
    price: formData.get("price") ?? "",
    currency: formData.get("currency") || "EUR",
    url: formData.get("url") ?? "",
    merchant: formData.get("merchant") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    priority: formData.get("priority") ?? 3,
    quantity: formData.get("quantity") ?? 1,
  });
}

type Parsed = NonNullable<ReturnType<typeof readGiftForm>["data"]>;

function toGiftInput(data: Parsed) {
  return {
    title: data.title,
    description: data.description || null,
    note: data.note || null,
    priceCents: parsePriceInput(data.price),
    currency: data.currency.toUpperCase(),
    url: data.url || null,
    merchant: data.merchant || null,
    imageUrl: data.imageUrl || null,
    priority: data.priority,
    quantity: data.quantity,
  };
}

export async function createGiftAction(
  listId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = readGiftForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "invalid" };
  }

  const gift = await createGift(user.id, listId, toGiftInput(parsed.data));
  if (!gift) return { error: "generic" };

  revalidatePath(`/lists/${listId}`);
  return { success: "saved" };
}

/**
 * Zelfde als createGiftAction, maar met de lijst(en) als veld in het formulier
 * in plaats van vooraf vastgezet. Voor het toevoegscherm en de bewaarknop,
 * waar je pas bij het opslaan kiest waar het cadeau heen gaat.
 *
 * Meerdere lijsten mag: hetzelfde cadeau komt dan in elk ervan te staan, als
 * een eigen exemplaar. Handig voor iets wat op je verjaardagslijst én je
 * kerstlijst thuishoort.
 */
export async function createGiftInListAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const listIds = formData
    .getAll("listId")
    .map((value) => String(value))
    .filter(Boolean);
  if (listIds.length === 0) return { error: "required" };

  const parsed = readGiftForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "invalid" };
  }

  const input = toGiftInput(parsed.data);
  for (const listId of listIds) {
    // createGift controleert zelf of de lijst van deze gebruiker is.
    const gift = await createGift(user.id, listId, input);
    if (!gift) return { error: "generic" };
    revalidatePath(`/lists/${listId}`);
  }

  revalidatePath("/dashboard");
  return { success: "saved" };
}

export async function updateGiftAction(
  listId: string,
  giftId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = readGiftForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "invalid" };
  }

  const gift = await updateGift(user.id, giftId, toGiftInput(parsed.data));
  if (!gift) return { error: "generic" };

  revalidatePath(`/lists/${listId}`);
  return { success: "saved" };
}

export async function deleteGiftAction(formData: FormData) {
  const user = await requireUser();
  const giftId = String(formData.get("giftId") ?? "");
  const listId = String(formData.get("listId") ?? "");
  if (!giftId) return;
  await deleteGift(user.id, giftId);
  revalidatePath(`/lists/${listId}`);
}

export async function moveGiftAction(formData: FormData) {
  const user = await requireUser();
  const listId = String(formData.get("listId") ?? "");
  const order = String(formData.get("order") ?? "")
    .split(",")
    .filter(Boolean);
  if (!listId || order.length === 0) return;
  await reorderGifts(user.id, listId, order);
  revalidatePath(`/lists/${listId}`);
}
