import type { VisitorList } from "@/lib/gifts";
import { getTranslator } from "@/lib/i18n/server";
import { daysUntil, formatDate } from "@/lib/i18n";
import { VisitorGiftCard } from "@/components/visitor-gift-card";

/**
 * De lijst zoals een bezoeker hem ziet.
 *
 * Twee pagina's laten dit zien: de deel-link (`/l/<code>`) en het voorbeeld dat
 * de eigenaar zelf opent (`/p/<id>`). Bij dat voorbeeld staat alles op
 * ongeclaimd en kan er niets worden vastgelegd — anders zou de eigenaar met één
 * klik zien wat er al voor hem gekocht is.
 */
export async function VisitorListView({
  list,
  claimerName,
  preview = false,
}: {
  list: VisitorList;
  claimerName: string;
  preview?: boolean;
}) {
  const { t, locale } = await getTranslator();

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
      <div
        className={`cover-${list.coverColor} relative overflow-hidden rounded-2xl p-5 sm:p-10`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        <div className="relative">
          <span className="rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold text-[#2a231d]">
            {t(`occasion.${list.occasion}` as "occasion.OTHER")}
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-5xl">
            {list.title}
          </h1>
          <p className="mt-2 text-white/90">
            {t("visitor.byLine", {
              // Werken er meer mensen aan de lijst, dan horen hun namen er
              // ook bij te staan.
              name: list.participants.map((person) => person.name).join(", "),
            })}
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
              defaultName={claimerName}
              preview={preview}
            />
          ))}
        </ul>
      )}
    </>
  );
}
