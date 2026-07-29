"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

/**
 * Het uitklapvakje met de lijsten die niet op je profiel staan. Dichtgeklapt,
 * want ze horen daar juist niet te staan — maar wel binnen handbereik.
 */
export function HiddenLists({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-sunken"
      >
        <span className="flex-1">
          <span className="block font-semibold text-ink">
            {t("profile.hidden")}
          </span>
          <span className="text-sm text-muted">
            {count === 1
              ? t("profile.hiddenBodyOne")
              : t("profile.hiddenBody", { count })}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`size-4 shrink-0 text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && <div className="border-t border-line p-4 sm:p-5">{children}</div>}
    </section>
  );
}
