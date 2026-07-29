"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteListAction, updateListAction } from "@/lib/actions/lists";
import { useI18n } from "@/lib/i18n/client";
import { ListForm, type ListFormValues } from "@/components/list-form";
import { Sheet } from "@/components/sheet";

/**
 * De instellingen van een lijst, achter het tandwiel in de hoek van de omslag.
 * Ze schuiven omhoog als paneel, net als het toevoegen van een cadeau — en ze
 * staan niet meer als een blok onderaan de pagina in de weg.
 */
export function ListSettings({
  listId,
  initial,
}: {
  listId: string;
  initial: ListFormValues;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const saved = useCallback(() => {
    setOpen(false);
    // De omslag erachter verandert mee: titel, kleur, gelegenheid.
    router.refresh();
  }, [router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("list.settings")}
        title={t("list.settings")}
        className="absolute right-3 top-3 z-10 flex size-10 items-center justify-center rounded-full bg-white/85 text-[#2a231d] backdrop-blur-sm transition-transform active:scale-95"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="size-5"
        >
          <circle cx="12" cy="12" r="3.2" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.1 4.7a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.01c.28.66.9 1.1 1.6 1.1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.03Z"
          />
        </svg>
      </button>

      <Sheet open={open} onClose={close} title={t("list.settings")}>
        <div className="pb-2">
          <ListForm
            action={updateListAction.bind(null, listId)}
            initial={initial}
            submitLabel={t("list.save")}
            onSaved={saved}
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
            <button type="submit" className="btn btn-danger w-full sm:w-auto">
              {t("list.delete")}
            </button>
          </form>
        </div>
      </Sheet>
    </>
  );
}
