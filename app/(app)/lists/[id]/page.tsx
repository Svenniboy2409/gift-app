import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getListForOwner } from "@/lib/gifts";
import { getTranslator } from "@/lib/i18n/server";
import { daysUntil, formatDate } from "@/lib/i18n";
import { GiftManager } from "@/components/gift-manager";
import { ListSettings } from "@/components/list-settings";
import { SharePanel } from "@/components/share-panel";

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  // getListForOwner selecteert bewust géén claims: de eigenaar mag niet
  // kunnen zien wat er al gekocht is.
  const [list, { t, locale }] = await Promise.all([
    getListForOwner(user.id, id),
    getTranslator(),
  ]);
  if (!list) notFound();

  const days = list.eventDate ? daysUntil(list.eventDate) : null;
  const countdown =
    days === null
      ? null
      : days === 0
        ? t("visitor.countdown.today")
        : days === 1
          ? t("visitor.countdown.day")
          : days > 1
            ? t("visitor.countdown.days", { count: days })
            : t("visitor.countdown.past", {
                date: formatDate(list.eventDate!, locale),
              });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="btn btn-ghost btn-sm -ml-3 mb-3">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="size-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t("list.back")}
        </Link>

        <div
          className={`cover-${list.coverColor} relative overflow-hidden rounded-2xl p-5 sm:p-8`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

          {/* De instellingen horen bij de lijst, dus staan ze op de omslag. */}
          <ListSettings
            listId={list.id}
            initial={{
              title: list.title,
              description: list.description ?? "",
              occasion: list.occasion,
              eventDate: list.eventDate
                ? list.eventDate.toISOString().slice(0, 10)
                : "",
              coverColor: list.coverColor,
              visibility: list.visibility,
            }}
          />
          <div className="relative">
            <span className="rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold text-[#2a231d]">
              {t(`occasion.${list.occasion}` as "occasion.OTHER")}
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-4xl">
              {list.title}
            </h1>
            {list.description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
                {list.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {countdown && (
                <span className="rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold text-[#2a231d]">
                  {countdown}
                </span>
              )}
              <span className="rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold text-[#2a231d]">
                {t(`visibility.${list.visibility}` as "visibility.LINK")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <SharePanel
        listId={list.id}
        shareCode={list.shareCode}
        handle={user.handle}
        visibility={list.visibility}
      />

      <GiftManager listId={list.id} gifts={list.gifts} />
    </div>
  );
}
