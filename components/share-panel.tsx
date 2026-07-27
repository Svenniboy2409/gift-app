"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateShareCodeAction } from "@/lib/actions/lists";
import { useOrigin } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n/client";

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
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={shareUrl}
              onFocus={(event) => event.target.select()}
              className="field font-mono text-xs sm:text-sm"
              aria-label={t("share.title")}
            />
            <button type="button" className="btn btn-primary shrink-0" onClick={copy}>
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
