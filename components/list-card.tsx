import Link from "next/link";
import { daysUntil, formatDate, type Locale, type Translator } from "@/lib/i18n";

export type ListCardData = {
  id?: string;
  title: string;
  description: string | null;
  occasion: string;
  eventDate: Date | null;
  coverColor: string;
  shareCode: string;
  visibility?: string;
  giftCount: number;
};

function countdownLabel(
  eventDate: Date | null,
  t: Translator,
  locale: Locale,
) {
  if (!eventDate) return null;
  const days = daysUntil(eventDate);
  if (days === 0) return t("visitor.countdown.today");
  if (days === 1) return t("visitor.countdown.day");
  if (days > 1) return t("visitor.countdown.days", { count: days });
  return t("visitor.countdown.past", { date: formatDate(eventDate, locale) });
}

function giftCountLabel(count: number, t: Translator) {
  if (count === 0) return t("dashboard.giftCountZero");
  if (count === 1) return t("dashboard.giftCountOne");
  return t("dashboard.giftCount", { count });
}

/** Kaart voor een lijst. `href` bepaalt of je naar de editor of de deelpagina gaat. */
export function ListCard({
  list,
  href,
  t,
  locale,
}: {
  list: ListCardData;
  href: string;
  t: Translator;
  locale: Locale;
}) {
  const countdown = countdownLabel(list.eventDate, t, locale);

  return (
    <Link href={href} className="card card-hover group flex flex-col overflow-hidden">
      <div
        className={`cover-${list.coverColor} relative h-28 shrink-0 overflow-hidden`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold text-[#2a231d] backdrop-blur-sm">
          {t(`occasion.${list.occasion}` as "occasion.OTHER")}
        </span>
        {list.visibility === "PRIVATE" && (
          <span className="absolute right-4 top-4 rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold text-[#2a231d] backdrop-blur-sm">
            {t("visibility.PRIVATE")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="font-semibold leading-snug text-ink transition-colors group-hover:text-accent">
          {list.title}
        </h2>
        {list.description && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">
            {list.description}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          <span className="chip">{giftCountLabel(list.giftCount, t)}</span>
          {countdown && (
            <span className="chip bg-accent-soft text-accent">{countdown}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
