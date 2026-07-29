import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchPeople } from "@/lib/friends";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Zoeken naar mensen om uit te nodigen. Alleen voor wie is ingelogd. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(`people:${user.id}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  const query = new URL(request.url).searchParams.get("q") ?? "";
  const people = await searchPeople(user.id, query.slice(0, 60));
  return NextResponse.json({ people });
}
