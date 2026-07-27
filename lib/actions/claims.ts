"use server";

import { revalidatePath } from "next/cache";
import { claimGift, releaseClaim } from "@/lib/claims";
import { claimSchema } from "@/lib/validation";
import type { FormState } from "@/lib/actions/auth";

export async function claimGiftAction(
  shareCode: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = claimSchema.safeParse({
    giftId: formData.get("giftId"),
    name: formData.get("name"),
    quantity: formData.get("quantity") ?? 1,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "invalid" };
  }

  const result = await claimGift(
    parsed.data.giftId,
    parsed.data.name,
    parsed.data.quantity,
  );
  if (!result.ok) return { error: "generic" };

  revalidatePath(`/l/${shareCode}`);
  return { success: "claimed" };
}

export async function releaseClaimAction(formData: FormData) {
  const giftId = String(formData.get("giftId") ?? "");
  const shareCode = String(formData.get("shareCode") ?? "");
  if (!giftId) return;
  await releaseClaim(giftId);
  revalidatePath(`/l/${shareCode}`);
}
