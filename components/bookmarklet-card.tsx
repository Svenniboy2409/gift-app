"use client";

import { useEffect, useRef, useState } from "react";
import { buildBookmarklet } from "@/lib/bookmarklet";
import { useOrigin } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n/client";

/**
 * Uitleg en installatie van de bewaarknop.
 *
 * De href moet een `javascript:`-adres worden, en React weigert dat in een
 * href-attribuut — terecht, want dat is meestal een aanwijzing dat er iets
 * misgaat. Hier is het precies de bedoeling, dus zetten we het na het renderen
 * rechtstreeks op het element.
 */
export function BookmarkletCard() {
  const { t } = useI18n();
  const origin = useOrigin();
  const anchor = useRef<HTMLAnchorElement>(null);
  const [copied, setCopied] = useState(false);

  const code = origin ? buildBookmarklet(origin) : "";

  useEffect(() => {
    if (anchor.current && code) anchor.current.setAttribute("href", code);
  }, [code]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Klembord geweigerd; de gebruiker kan de tekst nog altijd selecteren.
    }
  }

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-semibold text-ink">{t("bookmarklet.title")}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        {t("bookmarklet.intro")}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-sunken p-4">
        <a
          ref={anchor}
          href="#"
          onClick={(event) => event.preventDefault()}
          draggable
          className="btn btn-primary cursor-grab active:cursor-grabbing"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="size-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 4h12v16l-6-4-6 4V4Z"
            />
          </svg>
          {t("bookmarklet.button")}
        </a>
        <button type="button" className="btn btn-secondary" onClick={copy}>
          {copied ? t("share.copied") : t("bookmarklet.copy")}
        </button>
      </div>

      <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted">
        <div>
          <p className="font-semibold text-ink">{t("bookmarklet.desktop")}</p>
          <p className="mt-1">{t("bookmarklet.desktopSteps")}</p>
        </div>
        <div>
          <p className="font-semibold text-ink">{t("bookmarklet.iphone")}</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>{t("bookmarklet.iphone1")}</li>
            <li>{t("bookmarklet.iphone2")}</li>
            <li>{t("bookmarklet.iphone3")}</li>
            <li>{t("bookmarklet.iphone4")}</li>
          </ol>
        </div>
        <p className="border-t border-line pt-4">{t("bookmarklet.privacy")}</p>
      </div>
    </section>
  );
}
