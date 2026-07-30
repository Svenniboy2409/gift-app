"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

/**
 * Delen of kopiëren, naast elkaar op één regel.
 *
 * De link zelf stond hier eerst in een veld tussen de twee knoppen. Dat nam
 * drie regels in beslag terwijl je er niets mee doet — je deelt hem of je
 * kopieert hem. Het veld staat er nog wel, alleen niet meer in beeld: zo kan
 * een schermlezer de link nog voorlezen en blijft hij te selecteren.
 */
export function ShareRow({
  url,
  title,
  shareLabel,
  linkLabel,
  className = "mt-3",
}: {
  url: string;
  /** Wat er in het deelvenster van de telefoon als titel komt te staan. */
  title: string;
  shareLabel: string;
  /** Waar het verborgen veld naar luistert. */
  linkLabel: string;
  /** Alleen de ruimte eromheen; die verschilt per plek. */
  className?: string;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Klembord geweigerd; delen blijft over.
    }
  }

  /**
   * Het deelvenster van de telefoon zelf: dan staat de link met twee tikken in
   * WhatsApp of een berichtje. Kent de browser dat niet, dan valt hij terug op
   * kopiëren naar het klembord.
   */
  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Geannuleerd of geweigerd; kopiëren blijft over.
      }
    }
    await copy();
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <button type="button" className="btn btn-primary flex-1" onClick={share}>
        <ShareIcon />
        {shareLabel}
      </button>
      <button type="button" className="btn btn-secondary flex-1" onClick={copy}>
        <CopyIcon />
        {copied ? t("share.copied") : t("share.copy")}
      </button>
      <input
        readOnly
        value={url}
        onFocus={(event) => event.target.select()}
        aria-label={linkLabel}
        className="sr-only"
      />
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className="size-4 shrink-0"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v13M8 7l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className="size-4 shrink-0"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"
      />
    </svg>
  );
}
