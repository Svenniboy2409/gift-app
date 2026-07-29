"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/client";

/**
 * Een paneel dat van onderen omhoog schuift, zoals in een telefoon-app.
 *
 * Op een breed scherm zou zo'n paneel over de volle breedte raar staan, dus
 * daar houden we hem in het midden en beperken we de breedte — verder is het
 * hetzelfde ding, wat schelt in onderhoud en in wat je moet onthouden.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;

    // De pagina eronder mag niet meescrollen zolang het paneel openstaat.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="sheet-backdrop absolute inset-0 bg-black/45"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-raised shadow-soft-lg sm:max-w-lg sm:rounded-3xl"
      >
        {/* Het greepje: laat zien dat dit paneel weg kan. */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-line-strong" />
        </div>

        <div className="flex items-center gap-3 px-5 pb-3 pt-3">
          <h2 className="flex-1 text-lg font-semibold tracking-tight text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="btn btn-ghost btn-sm px-2"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-5"
            >
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Alleen de inhoud scrollt, zodat de titel blijft staan. */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
