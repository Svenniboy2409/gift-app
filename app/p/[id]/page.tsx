import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getParticipants } from "@/lib/collab";
import { getListForOwner, type VisitorList } from "@/lib/gifts";
import { getTranslator } from "@/lib/i18n/server";
import { PlainHeader, SiteFooter } from "@/components/site-header";
import { VisitorListView } from "@/components/visitor-list-view";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * "Bekijken zoals bezoekers": je eigen lijst, met de ogen van iemand anders.
 *
 * Dit is nadrukkelijk niet de deel-link. Die laat zien wat er al geclaimd is,
 * en dat is precies wat je als jarige niet hoort te weten. Hier komt alles uit
 * `getListForOwner`, die claims niet eens ophaalt: alles staat dus op
 * ongeclaimd, hoeveel er in werkelijkheid ook gekocht is. Claimen kan hier
 * niet — er valt niets vast te leggen.
 */
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const [list, { t }] = await Promise.all([
    getListForOwner(user.id, id),
    getTranslator(),
  ]);
  if (!list) notFound();

  const participants = await getParticipants(list.id);

  const preview: VisitorList = {
    ...list,
    ownerName: participants[0].name,
    ownerHandle: participants[0].handle,
    participants: participants.map(({ name, handle }) => ({ name, handle })),
    gifts: list.gifts.map((gift) => ({
      ...gift,
      claimedCount: 0,
      claimedByOthers: [],
      myClaim: null,
    })),
  };

  return (
    <>
      <PlainHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-12">
        <div className="card mb-6 flex flex-wrap items-center gap-3 p-4">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink">
              {t("preview.title")}
            </span>
            <span className="block text-sm text-muted">{t("preview.body")}</span>
          </span>
          <Link
            href={`/lists/${list.id}`}
            className="btn btn-secondary btn-sm w-full sm:w-auto"
          >
            {t("preview.back")}
          </Link>
        </div>

        <VisitorListView list={preview} claimerName="" preview />
      </main>

      <SiteFooter />
    </>
  );
}
