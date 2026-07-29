"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateShareCodeAction } from "@/lib/actions/lists";
import { useOrigin } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n/client";

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="size-4">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v13M8 7l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"
      />
    </svg>
  );
}

export function SharePanel({
  listId,
  shareCode,
  handle,
  visibility,
}: {
  listId: string;
  shareCode: string;
  handle: string;
  visibility: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const shareUrl = `${origin}/l/${shareCode}`;
  const profileUrl = `${origin}/u/${handle}`;
  const disabled = visibility === "PRIVATE";

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Klembord geweigerd — de gebruiker kan de link nog altijd selecteren.
    }
  }

  /**
   * Het deelvenster van de telefoon zelf: dan staat je lijst met twee tikken in
   * WhatsApp of een berichtje. Kent de browser dat niet, dan valt hij terug op
   * kopiëren naar het klembord.
   */
  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: t("share.title"), url: shareUrl });
        return;
      } catch {
        // Geannuleerd of geweigerd; kopiëren blijft over.
      }
    }
    await copy();
  }

  function regenerate() {
    if (!window.confirm(t("share.regenerateConfirm"))) return;
    const data = new FormData();
    data.set("listId", listId);
    startTransition(async () => {
      await regenerateShareCodeAction(data);
      router.refresh();
    });
  }

  return (
    <section className="card p-5">
      <h2 className="font-semibold text-ink">{t("share.title")}</h2>
      <p className="mt-1 text-sm text-muted">
        {disabled ? t("share.disabled") : t("share.body")}
      </p>

      {!disabled && (
        <>
          {/* Op de telefoon staat het deelvenster voorop; de link zelf staat
              eronder voor wie hem wil kopiëren of nalezen. */}
          <button
            type="button"
            className="btn btn-primary mt-3 w-full sm:hidden"
            onClick={share}
          >
            <ShareIcon />
            {t("share.share")}
          </button>

          <div className="mt-2 flex flex-col gap-2 sm:mt-3 sm:flex-row">
            <input
              readOnly
              value={shareUrl}
              onFocus={(event) => event.target.select()}
              className="field font-mono text-xs sm:text-sm"
              aria-label={t("share.title")}
            />
            <button type="button" className="btn btn-secondary shrink-0" onClick={copy}>
              {copied ? t("share.copied") : t("share.copy")}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1">
            <a
              href={`/l/${shareCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
            >
              {t("share.open")}
            </a>
            {visibility === "PUBLIC" && (
              <a
                href={`/u/${handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                title={profileUrl}
              >
                {t("share.profile")}
              </a>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={regenerate}
              disabled={pending}
            >
              {t("share.regenerate")}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
