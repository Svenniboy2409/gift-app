"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n/client";

const STORAGE_KEY = "wenslijst-theme";

type Theme = "light" | "dark";

/**
 * Zet het thema vóór de eerste paint, zodat je geen witte flits ziet als je
 * donker hebt gekozen.
 */
export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

// Kleine store rond localStorage en de systeemvoorkeur, zodat React de waarde
// via useSyncExternalStore kan lezen in plaats van via een effect.
let listeners: (() => void)[] = [];

function subscribe(listener: () => void) {
  listeners.push(listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners = listeners.filter((entry) => entry !== listener);
    media.removeEventListener("change", listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // Bijvoorbeeld in een privévenster waar localStorage geblokkeerd is.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function setTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Niet kunnen onthouden is geen reden om het thema niet te wisselen.
  }
  for (const listener of listeners) listener();
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
      <circle cx="12" cy="12" r="4" />
      <path
        strokeLinecap="round"
        d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
      />
    </svg>
  );
}

export function ThemeToggle() {
  const { t } = useI18n();
  const theme = useSyncExternalStore<Theme>(
    subscribe,
    getSnapshot,
    () => "light",
  );

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="btn btn-ghost btn-sm"
      aria-label={t("theme.toggle")}
      title={t("theme.toggle")}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
