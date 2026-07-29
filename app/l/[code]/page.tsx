import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getListForVisitor } from "@/lib/gifts";
import { readClaimerName, readClaimerToken } from "@/lib/claims";
import { getTranslator } from "@/lib/i18n/server";
import { daysUntil, formatDate } from "@/lib/i18n";
import { PlainHeader, SiteFooter } from "@/components/site-header";
import { VisitorGiftCard } from "@/components/visitor-gift-card";

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
  const [claimerToken, claimerName, { t, locale }] = await Promise.all([
    readClaimerToken(),
    readClaimerName(),
    getTranslator(),
  ]);

  const list = await getListForVisitor(code, claimerToken);
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
    <>
      <PlainHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-12">
        <div className={`cover-${list.coverColor} relative overflow-hidden rounded-2xl p-5 sm:p-10`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
          <div className="relative">
            <span className="rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold text-[#2a231d]">
              {t(`occasion.${list.occasion}` as "occasion.OTHER")}
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-5xl">
              {list.title}
            </h1>
            <p className="mt-2 text-white/90">
              {t("visitor.byLine", { name: list.ownerName })}
            </p>
            {list.description && (
              <p className="mt-3 max-w-2xl leading-relaxed text-white/90">
                {list.description}
              </p>
            )}
            {countdown && (
              <span className="mt-4 inline-block rounded-full bg-white/85 px-3 py-1 text-sm font-semibold text-[#2a231d]">
                {countdown}
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-sunken p-4 text-sm leading-relaxed text-muted">
          <p>{t("visitor.intro")}</p>
          <p className="mt-1.5 font-medium text-ink">
            {t("visitor.hiddenNotice", { name: list.ownerName })}
          </p>
        </div>

        {list.gifts.length === 0 ? (
          <div className="card mt-6 px-6 py-16 text-center">
            <h2 className="font-semibold text-ink">{t("gift.empty.title")}</h2>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {list.gifts.map((gift) => (
              <VisitorGiftCard
                key={gift.id}
                gift={gift}
                shareCode={list.shareCode}
                defaultName={claimerName ?? ""}
              />
            ))}
          </ul>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
