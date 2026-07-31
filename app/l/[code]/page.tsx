import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canEditList } from "@/lib/collab";
import { getListForVisitor } from "@/lib/gifts";
import { readClaimerName, readClaimerToken } from "@/lib/claims";
import { PlainHeader, SiteFooter } from "@/components/site-header";
import { VisitorListView } from "@/components/visitor-list-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const list = await getListForVisitor(code, null);
  if (!list) return { title: "Wenslijst" };
  return {
    title: `${list.title} — ${list.ownerName}`,
    description: list.description ?? undefined,
    // Gedeelde lijsten horen niet in zoekmachines terecht te komen.
    robots: { index: false, follow: false },
  };
}

export default async function SharedListPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [claimerToken, claimerName] = await Promise.all([
    readClaimerToken(),
    readClaimerName(),
  ]);

  const viewer = await getCurrentUser();
  const list = await getListForVisitor(code, claimerToken, viewer?.id);
  if (!list) notFound();

  // Open je je eigen deel-link, dan wil je niet de bezoekerskant zien: daar
  // staat wat er al gekocht is. Je gaat naar de lijst zelf, waar je hem
  // samenstelt. Wie meewerkt aan de lijst hoort daar net zo goed.
  if (viewer && (await canEditList(viewer.id, list.id))) {
    redirect(`/lists/${list.id}`);
  }

  return (
    <>
      <PlainHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-12">
        <VisitorListView list={list} claimerName={claimerName ?? ""} />
      </main>

      <SiteFooter />
    </>
  );
}
