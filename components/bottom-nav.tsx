"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";

/**
 * De navigatiebalk onderaan, zoals in een echte app.
 *
 * Alleen op telefoonformaat: op een breder scherm is de balk bovenaan
 * prettiger, want daar staat je hand niet onderaan het scherm. De knop in het
 * midden doet wat op die plek het meest voor de hand ligt — sta je in een
 * lijst, dan is dat een cadeau toevoegen; sta je ergens anders, dan een nieuwe
 * lijst maken.
 */

function ListsIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-6"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="7"
        rx="2"
        fillOpacity={active ? 0.18 : 0}
      />
      <rect
        x="3"
        y="14"
        width="18"
        height="6"
        rx="2"
        fillOpacity={active ? 0.18 : 0}
      />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-6"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5" fillOpacity={active ? 0.18 : 0} fill="currentColor" />
      <path
        strokeLinecap="round"
        d="M4.5 20a7.5 7.5 0 0 1 15 0"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.18 : 0}
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      className="size-7"
      aria-hidden="true"
    >
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function BottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const onLists = pathname === "/dashboard" || pathname.startsWith("/lists");
  const onSettings = pathname.startsWith("/settings");

  // Binnen een bestaande lijst voegt de plusknop een cadeau toe: hij brengt de
  // plakbalk in beeld en zet de cursor er meteen in.
  const inList = /^\/lists\/(?!new$)[^/]+$/.test(pathname);

  function add() {
    if (!inList) {
      router.push("/lists/new");
      return;
    }
    const input = document.getElementById("paste-url");
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    (input as HTMLInputElement | null)?.focus({ preventScroll: true });
  }

  return (
    <nav className="tabbar md:hidden" aria-label={t("nav.main")}>
      <Link
        href="/dashboard"
        className="tabbar-item"
        aria-current={onLists ? "page" : undefined}
      >
        <ListsIcon active={onLists} />
        {t("nav.lists")}
      </Link>

      <div className="flex flex-1 justify-center">
        <button
          type="button"
          onClick={add}
          className="tabbar-action"
          aria-label={inList ? t("gift.addTitle") : t("dashboard.newList")}
        >
          <PlusIcon />
        </button>
      </div>

      <Link
        href="/settings"
        className="tabbar-item"
        aria-current={onSettings ? "page" : undefined}
      >
        <SettingsIcon active={onSettings} />
        {t("nav.settings")}
      </Link>
    </nav>
  );
}
