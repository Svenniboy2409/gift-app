"use client";

import { useState } from "react";
import { deleteListAction, updateListAction } from "@/lib/actions/lists";
import { useI18n } from "@/lib/i18n/client";
import { ListForm, type ListFormValues } from "@/components/list-form";

/** Inklapbaar paneel met de instellingen van de lijst. */
export function ListSettings({
  listId,
  initial,
}: {
  listId: string;
  initial: ListFormValues;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-sunken"
        aria-expanded={open}
      >
        <span className="font-semibold text-ink">{t("list.settings")}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`size-4 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-line p-4 sm:p-5">
          <ListForm
            action={updateListAction.bind(null, listId)}
            initial={initial}
            submitLabel={t("list.save")}
          />

          {/* Los formulier: een <form> mag niet in een ander <form> staan. */}
          <form
            action={deleteListAction}
            className="mt-6 border-t border-line pt-4"
            onSubmit={(event) => {
              if (!window.confirm(t("list.deleteConfirm"))) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="listId" value={listId} />
            <button type="submit" className="btn btn-danger w-full sm:-ml-3 sm:w-auto">
              {t("list.delete")}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
