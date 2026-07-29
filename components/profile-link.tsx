"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

/**
 * Je profielnaam, met de link naar de openbare pagina erachter. Handig om te
 * zien wat een ander te zien krijgt.
 */
export function ProfileLink({ handle }: { handle: string }) {
  const { t } = useI18n();

  return (
    <Link
      href={`/u/${handle}`}
      className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent"
      title={t("profile.view")}
    >
      @{handle}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        className="size-3.5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 5h5v5M19 5l-8 8M17 14v5H5V7h5"
        />
      </svg>
    </Link>
  );
}
