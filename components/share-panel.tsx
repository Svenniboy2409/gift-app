"use client";

import { useI18n } from "@/lib/i18n/client";
import { useOrigin } from "@/lib/hooks";
import { ShareRow } from "@/components/share-row";

export function SharePanel({
  shareCode,
  visibility,
}: {
  shareCode: string;
  visibility: string;
}) {
  const { t } = useI18n();
  const origin = useOrigin();

  const shareUrl = `${origin}/l/${shareCode}`;
  const disabled = visibility === "PRIVATE";
  const friendsOnly = visibility === "FRIENDS";

  return (
    <section className="card p-5">
      <h2 className="font-semibold text-ink">{t("share.title")}</h2>
      <p className="mt-1 text-sm text-muted">
        {disabled
          ? t("share.disabled")
          : friendsOnly
            ? t("share.friendsOnly")
            : t("share.body")}
      </p>

      {!disabled && (
        <>
          <ShareRow
            url={shareUrl}
            title={t("share.title")}
            shareLabel={t("share.share")}
            linkLabel={t("share.title")}
          />

          {/* Een nieuwe link maken hoort bij de instellingen van de lijst; hier
              blijft alleen het kijkje van een bezoeker over. */}
          <div className="mt-3">
            <a
              href={`/l/${shareCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm -ml-3"
            >
              {t("share.open")}
            </a>
          </div>
        </>
      )}
    </section>
  );
}
