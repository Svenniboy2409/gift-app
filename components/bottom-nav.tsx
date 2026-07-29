"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { useSheets } from "@/components/sheets";

/**
 * De navigatiebalk onderaan, zoals in een echte app.
 *
 * Alleen op telefoonformaat: op een breder scherm is de balk bovenaan
 * prettiger, want daar staat je hand niet onderaan het scherm. De knop in het
 * midden opent het toevoegscherm, dat van onderen omhoog schuift.
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

function SocialIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-6"
      aria-hidden="true"
    >
      <circle
        cx="9"
        cy="8"
        r="3.2"
        fill="currentColor"
        fillOpacity={active ? 0.18 : 0}
      />
      <path
        strokeLinecap="round"
        d="M2.5 19a6.5 6.5 0 0 1 13 0"
        fill="currentColor"
        fillOpacity={active ? 0.18 : 0}
      />
      <path
        strokeLinecap="round"
        d="M16.5 5.5a3 3 0 0 1 0 5.4M18 19a6.6 6.6 0 0 0-1.6-4.3"
      />
    </svg>
  );
}

function AccountIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-6"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="3.5"
        fillOpacity={active ? 0.18 : 0}
        fill="currentColor"
      />
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
  const { openGift } = useSheets();

  const onLists = pathname === "/dashboard" || pathname.startsWith("/lists");
  const onSocial = pathname.startsWith("/friends");
  const onAccount =
    pathname.startsWith("/account") || pathname.startsWith("/settings");

  return (
    <nav className="tabbar md:hidden" aria-label={t("nav.main")}>
      {/* Twee groepen met evenveel ruimte houden de plusknop precies in het
          midden, ook nu er links twee tabbladen staan en rechts één. */}
      <div className="flex flex-1 justify-around">
        <Link
          href="/dashboard"
          className="tabbar-item"
          aria-current={onLists ? "page" : undefined}
        >
          <ListsIcon active={onLists} />
          {t("nav.lists")}
        </Link>

        <Link
          href="/friends"
          className="tabbar-item"
          aria-current={onSocial ? "page" : undefined}
        >
          <SocialIcon active={onSocial} />
          {t("nav.social")}
        </Link>
      </div>

      {/* De plusknop telt niet mee als tabblad. */}
      <div className="flex w-16 shrink-0 justify-center">
        <button
          type="button"
          onClick={openGift}
          className="tabbar-action"
          aria-label={t("gift.addTitle")}
        >
          <PlusIcon />
        </button>
      </div>

      <div className="flex flex-1 justify-around">
        <Link
          href="/account"
          className="tabbar-item max-w-24"
          aria-current={onAccount ? "page" : undefined}
        >
          <AccountIcon active={onAccount} />
          {t("nav.account")}
        </Link>
      </div>
    </nav>
  );
}
