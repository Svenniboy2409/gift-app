"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateShareCodeAction } from "@/lib/actions/lists";
import { useI18n } from "@/lib/i18n/client";

/**
 * Een nieuwe deel-link maken. Dat is geen alledaagse handeling — je doet het
 * als de oude link ergens is beland waar hij niet hoort — dus staat hij bij de
 * instellingen van de lijst en niet naast de knop om te delen.
 */
export function ShareCodeSettings({ listId }: { listId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  function regenerate() {
    if (!window.confirm(t("share.regenerateConfirm"))) return;
    start(async () => {
      const data = new FormData();
      data.set("listId", listId);
      await regenerateShareCodeAction(data);
      router.refresh();
    });
  }

  return (
    <section className="border-t border-line pt-5">
      <h3 className="font-semibold text-ink">{t("share.linkTitle")}</h3>
      <p className="mt-1 text-sm text-muted">{t("share.linkBody")}</p>
      <button
        type="button"
        className="btn btn-secondary btn-sm mt-3 w-full sm:w-auto"
        onClick={regenerate}
        disabled={pending}
      >
        {t("share.regenerate")}
      </button>
    </section>
  );
}
