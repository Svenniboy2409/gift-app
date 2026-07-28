"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { createGiftInListAction } from "@/lib/actions/gifts";
import { useI18n } from "@/lib/i18n/client";
import { EMPTY_DRAFT, GiftEditor, type GiftDraft } from "@/components/gift-editor";

export type PickerList = { id: string; title: string };

/**
 * Het scherm dat opent als je op de bewaarknop tikt terwijl je op een
 * productpagina staat. Alles staat al ingevuld; je kiest alleen nog de lijst.
 */
export function AddFromBookmarklet({
  lists,
  draft,
  imageChoices,
}: {
  lists: PickerList[];
  draft: Partial<GiftDraft>;
  /** De andere foto's die op de productpagina stonden. */
  imageChoices?: string[];
}) {
  const { t } = useI18n();
  const [saved, setSaved] = useState(false);

  const done = useCallback(() => setSaved(true), []);

  if (saved) {
    return (
      <div className="card p-7 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--success)"
            strokeWidth="2.4"
            className="size-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-semibold text-ink">
          {t("bookmarklet.saved")}
        </h1>
        <p className="mt-1.5 text-sm text-muted">{t("bookmarklet.savedBody")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.close()}
          >
            {t("bookmarklet.close")}
          </button>
          <Link href="/dashboard" className="btn btn-ghost">
            {t("nav.dashboard")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 sm:p-6">
      <h1 className="text-xl font-semibold tracking-tight text-ink">
        {t("bookmarklet.addTitle")}
      </h1>
      <p className="mt-1 text-sm text-muted">{t("bookmarklet.addBody")}</p>

      <div className="mt-5">
        <GiftEditor
          draft={{ ...EMPTY_DRAFT, ...draft }}
          action={createGiftInListAction}
          onDone={done}
          onCancel={() => window.close()}
          cancelLabel={t("bookmarklet.close")}
          imageChoices={imageChoices}
        >
          <div>
            <label className="label" htmlFor="listId">
              {t("bookmarklet.chooseList")}
            </label>
            <select id="listId" name="listId" className="field" required>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.title}
                </option>
              ))}
            </select>
          </div>
        </GiftEditor>
      </div>
    </div>
  );
}
