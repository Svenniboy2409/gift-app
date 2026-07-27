"use client";

import { useTransition } from "react";
import { switchLocaleAction } from "@/lib/actions/locale";
import { LOCALES, type Locale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();

  function select(next: Locale) {
    if (next === locale || pending) return;
    const data = new FormData();
    data.set("locale", next);
    startTransition(() => {
      void switchLocaleAction(data);
    });
  }

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-lg bg-sunken p-0.5"
      role="group"
      aria-label={t("settings.language")}
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => select(code)}
          aria-pressed={code === locale}
          className={`rounded-md px-2 py-1 text-xs font-semibold uppercase transition-colors ${
            code === locale
              ? "bg-raised text-ink shadow-sm"
              : "text-subtle hover:text-ink"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
