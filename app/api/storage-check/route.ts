import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { StorageError, checkStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * De zelftest van de foto-opslag: zet een testbestandje neer, ruimt het weer op
 * en vertelt wat er misging als dat niet lukt. Zonder deze knop kom je er pas
 * achter bij je eerste upload, en dan zonder te weten waaraan het ligt.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(`storage-check:${user.id}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  try {
    const { mode, tokenName } = await checkStorage();
    return NextResponse.json({ ok: true, mode, detail: tokenName });
  } catch (error) {
    console.error("storage check failed", error);
    const known = error instanceof StorageError;
    return NextResponse.json({
      ok: false,
      error: known ? error.message : "storage-failed",
      detail: known ? error.detail : (error as Error).message?.slice(0, 300),
    });
  }
}
