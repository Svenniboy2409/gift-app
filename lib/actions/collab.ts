"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  acceptListInvite,
  inviteToList,
  joinList,
  removeListInvite,
  removeMember,
} from "@/lib/collab";
import type { FormState } from "@/lib/actions/auth";

/** Meedoen aan een lijst raakt het overzicht, het profiel en de lijst zelf. */
function refresh(listId?: string) {
  if (listId) revalidatePath(`/lists/${listId}`);
  revalidatePath("/friends");
  revalidatePath("/dashboard");
  revalidatePath("/account");
}

export async function inviteToListAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const listId = String(formData.get("listId") ?? "");
  const toId = String(formData.get("userId") ?? "");
  if (!listId || !toId) return { error: "required" };

  const result = await inviteToList(user.id, listId, toId);
  refresh(listId);

  if (result === "full") return { error: "list-full" };
  if (result === "not-owner") return { error: "generic" };
  if (result === "unknown") return { error: "generic" };
  return { success: result === "already" ? "saved" : "request-sent" };
}

export async function acceptListInviteAction(formData: FormData) {
  const user = await requireUser();
  await acceptListInvite(user.id, String(formData.get("inviteId") ?? ""));
  refresh();
}

export async function removeListInviteAction(formData: FormData) {
  const user = await requireUser();
  await removeListInvite(user.id, String(formData.get("inviteId") ?? ""));
  refresh();
}

export async function removeMemberAction(formData: FormData) {
  const user = await requireUser();
  const listId = String(formData.get("listId") ?? "");
  await removeMember(user.id, listId, String(formData.get("userId") ?? ""));
  refresh(listId);
}

export async function joinListAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const listId = String(formData.get("listId") ?? "");
  if (!listId) return { error: "required" };

  const result = await joinList(user.id, listId);
  refresh(listId);

  if (result === "full") return { error: "list-full" };
  if (result === "unknown") return { error: "generic" };

  // Meteen naar de lijst: daar begint het werk.
  redirect(`/lists/${listId}`);
}
