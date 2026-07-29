"use client";

import { useI18n } from "@/lib/i18n/client";
import { useSheets } from "@/components/sheets";

function PlusIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden="true"
    >
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

/**
 * De knoppen die het schuifpaneel openen. Ze staan los van de pagina's
 * eromheen, zodat die gewoon op de server kunnen blijven draaien.
 */

/** Het plusje naast de kop "Mijn lijsten". */
export function NewListIconButton() {
  const { t } = useI18n();
  const { openList } = useSheets();

  return (
    <button
      type="button"
      onClick={openList}
      className="btn btn-ghost -mr-2 px-2 text-ink"
      aria-label={t("dashboard.newList")}
      title={t("dashboard.newList")}
    >
      <PlusIcon className="size-7" />
    </button>
  );
}

/** De knop met tekst, voor een breed scherm. */
export function NewListButton({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const { openList } = useSheets();

  return (
    <button type="button" onClick={openList} className={`btn btn-primary ${className}`}>
      <PlusIcon className="size-4" />
      {t("dashboard.newList")}
    </button>
  );
}

/** Het gestippelde vak onderaan de rij lijsten. */
export function NewListCard() {
  const { t } = useI18n();
  const { openList } = useSheets();

  return (
    <button
      type="button"
      onClick={openList}
      className="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-line-strong px-4 py-8 text-muted transition-colors hover:border-accent hover:text-accent"
    >
      <PlusIcon className="size-7" />
      <span className="text-sm font-semibold">{t("dashboard.newList")}</span>
    </button>
  );
}

/** Cadeau toevoegen — dezelfde weg als de plusknop onderaan. */
export function AddGiftButton({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const { openGift } = useSheets();

  return (
    <button type="button" onClick={openGift} className={`btn btn-primary ${className}`}>
      <PlusIcon className="size-4" />
      {t("gift.addTitle")}
    </button>
  );
}
