"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  acceptRequest,
  removeFriend,
  removeRequest,
  sendRequest,
} from "@/lib/friends";
import type { FormState } from "@/lib/actions/auth";

/** Alles wat met vrienden te maken heeft raakt dezelfde twee pagina's. */
function refresh() {
  revalidatePath("/friends");
  revalidatePath("/account");
}

export async function sendRequestAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const toId = String(formData.get("userId") ?? "");
  if (!toId) return { error: "required" };

  const exists = await prisma.user.findUnique({
    where: { id: toId },
    select: { id: true },
  });
  if (!exists) return { error: "generic" };

  const result = await sendRequest(user.id, toId);
  refresh();
  return { success: result === "friends" ? "friend-added" : "request-sent" };
}

export async function acceptRequestAction(formData: FormData) {
  const user = await requireUser();
  await acceptRequest(user.id, String(formData.get("requestId") ?? ""));
  refresh();
}

export async function removeRequestAction(formData: FormData) {
  const user = await requireUser();
  await removeRequest(user.id, String(formData.get("requestId") ?? ""));
  refresh();
}

export async function removeFriendAction(formData: FormData) {
  const user = await requireUser();
  await removeFriend(user.id, String(formData.get("userId") ?? ""));
  refresh();
}
