"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";
import type { ScrapeResponse } from "@/app/api/scrape/route";
import {
  createGiftInListAction,
  setGiftListsAction,
} from "@/lib/actions/gifts";
import { createListAction } from "@/lib/actions/lists";
import { useI18n } from "@/lib/i18n/client";
import {
  EMPTY_DRAFT,
  GiftEditor,
  centsToInput,
  type GiftDraft,
} from "@/components/gift-editor";
import { ListForm } from "@/components/list-form";
import { Sheet } from "@/components/sheet";

export type PickableList = { id: string; title: string };

/** Een cadeau dat je in andere lijsten wilt zetten. */
export type GiftInLists = { id: string; title: string; listIds: string[] };

type Sheets = {
  /** Cadeau toevoegen; de lijst waar je in zit staat vast al aangevinkt. */
  openGift: () => void;
  /** Nieuwe lijst maken. */
  openList: () => void;
  /** In welke lijsten staat dit cadeau? */
  openGiftLists: (gift: GiftInLists) => void;
};

const SheetContext = createContext<Sheets | null>(null);

export function useSheets() {
  const context = useContext(SheetContext);
  if (!context) {
    throw new Error("useSheets hoort binnen SheetsProvider te staan");
  }
  return context;
}

/** De lijst waar je nu in zit, afgeleid van het adres. */
function currentListId(pathname: string) {
  const match = /^\/lists\/(?!new$)([^/]+)$/.exec(pathname);
  return match?.[1] ?? null;
}

export function SheetsProvider({
  lists,
  children,
}: {
  lists: PickableList[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState<{
    kind: "gift" | "list" | "giftLists";
    /** Loopt op bij elk openen, zodat de inhoud schoon opnieuw begint. */
    token: number;
    /** Alleen bij "giftLists": om welk cadeau het gaat. */
    gift?: GiftInLists;
  } | null>(null);
  const [shownAt, setShownAt] = useState(pathname);

  // Ga je naar een andere pagina, dan hoort het paneel dicht — en dicht te
  // blijven. Alleen verbergen is niet genoeg: dan staat het er weer zodra je
  // met de terugknop terugkomt op de pagina waar je het opende.
  if (pathname !== shownAt) {
    setShownAt(pathname);
    if (open) setOpen(null);
  }

  const value = useMemo<Sheets>(
    () => ({
      openGift: () =>
        setOpen((previous) => ({
          kind: "gift",
          token: (previous?.token ?? 0) + 1,
        })),
      openList: () =>
        setOpen((previous) => ({
          kind: "list",
          token: (previous?.token ?? 0) + 1,
        })),
      openGiftLists: (gift) =>
        setOpen((previous) => ({
          kind: "giftLists",
          token: (previous?.token ?? 0) + 1,
          gift,
        })),
    }),
    [],
  );

  const close = useCallback(() => setOpen(null), []);

  return (
    <SheetContext.Provider value={value}>
      {children}

      <AddGiftSheet
        key={`gift-${open?.token ?? 0}`}
        open={open?.kind === "gift"}
        onClose={close}
        lists={lists}
        defaultListId={currentListId(pathname)}
      />

      <NewListSheet
        key={`list-${open?.token ?? 0}`}
        open={open?.kind === "list"}
        onClose={close}
      />

      <GiftListsSheet
        key={`giftlists-${open?.token ?? 0}`}
        open={open?.kind === "giftLists"}
        onClose={close}
        lists={lists}
        gift={open?.gift ?? null}
      />
    </SheetContext.Provider>
  );
}

/** Plak een link, wij halen de gegevens op. */
function PasteBar({
  onResult,
  onManual,
}: {
  onResult: (result: ScrapeResponse) => void;
  onManual: () => void;
}) {
  const { t } = useI18n();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchProduct(event: React.FormEvent) {
    event.preventDefault();
    const value = url.trim();
    if (!value || busy) return;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });

      if (response.status === 400) {
        setError(t("scrape.invalidUrl"));
        return;
      }
      if (!response.ok) {
        setError(t("error.generic"));
        return;
      }

      onResult((await response.json()) as ScrapeResponse);
      setUrl("");
    } catch {
      setError(t("error.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={fetchProduct} className="space-y-2">
        <label className="label" htmlFor="paste-url">
          {t("gift.pasteLabel")}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="size-4 shrink-0"
            >
              <path
                strokeLinecap="round"
                d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19"
              />
            </svg>
          </span>
          <input
            id="paste-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="field pl-10"
            type="text"
            inputMode="url"
            placeholder={t("gift.pastePlaceholder")}
            disabled={busy}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={busy || !url.trim()}
        >
          {busy ? t("gift.fetching") : t("gift.fetch")}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <button
        type="button"
        className="btn btn-ghost btn-sm mt-2 -ml-2"
        onClick={onManual}
      >
        {t("gift.manual")}
      </button>

      {busy && (
        <div className="mt-4 flex gap-4 rounded-xl bg-sunken p-4">
          <div className="skeleton size-20 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2 py-1">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-5 w-20" />
          </div>
        </div>
      )}
    </div>
  );
}

/** In welke lijst(en) gaat het cadeau? Meerdere mag. */
function ListPicker({
  lists,
  selected,
  onToggle,
  label = true,
}: {
  lists: PickableList[];
  selected: string[];
  onToggle: (id: string) => void;
  /** Uit als er al een kop boven staat. */
  label?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div>
      {label && <span className="label">{t("gift.chooseLists")}</span>}
      <div className="flex flex-wrap gap-2">
        {lists.map((list) => {
          const active = selected.includes(list.id);
          return (
            <button
              key={list.id}
              type="button"
              onClick={() => onToggle(list.id)}
              aria-pressed={active}
              className={`chip max-w-full px-3 py-2 text-sm ${
                active
                  ? "bg-accent-soft text-accent ring-1 ring-accent"
                  : "text-muted"
              }`}
            >
              {active && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  className="size-3.5 shrink-0"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                </svg>
              )}
              <span className="truncate">{list.title}</span>
            </button>
          );
        })}
      </div>
      {selected.length === 0 && (
        <p className="mt-1.5 text-xs text-danger">{t("gift.chooseListsHint")}</p>
      )}
    </div>
  );
}

function AddGiftSheet({
  open,
  onClose,
  lists,
  defaultListId,
}: {
  open: boolean;
  onClose: () => void;
  lists: PickableList[];
  defaultListId: string | null;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(() =>
    defaultListId && lists.some((list) => list.id === defaultListId)
      ? [defaultListId]
      : [],
  );
  const [editing, setEditing] = useState<{
    draft: GiftDraft;
    notice: string | null;
  } | null>(null);

  const done = useCallback(() => {
    onClose();
    router.refresh();
  }, [onClose, router]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  }

  function handleResult(result: ScrapeResponse) {
    const product = result.product;
    const blocked = result.reason === "blocked";
    const notice =
      result.quality === "failed"
        ? t(blocked ? "scrape.blocked" : "scrape.failed")
        : result.reason === "archived"
          ? t("scrape.archived")
          : blocked
            ? t("scrape.blockedPartial", {
                shop: product.merchant ?? t("scrape.thisShop"),
              })
            : result.quality === "partial"
              ? t("scrape.partial")
              : null;

    setEditing({
      notice,
      draft: {
        ...EMPTY_DRAFT,
        title: product.title ?? "",
        description: product.description ?? "",
        price: centsToInput(product.priceCents, locale),
        currency: product.currency || "EUR",
        url: product.url,
        merchant: product.merchant ?? "",
        imageUrl: product.imageUrl ?? "",
      },
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("gift.addTitle")}>
      {lists.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-muted">{t("bookmarklet.needList")}</p>
          <Link href="/lists/new" className="btn btn-primary mt-4">
            {t("dashboard.newList")}
          </Link>
        </div>
      ) : (
        <div className="space-y-5 pb-2">
          <ListPicker lists={lists} selected={selected} onToggle={toggle} />

          {editing ? (
            <GiftEditor
              draft={editing.draft}
              notice={editing.notice}
              action={createGiftInListAction}
              onDone={done}
              onCancel={() => setEditing(null)}
              disabled={selected.length === 0}
            >
              {selected.map((id) => (
                <input key={id} type="hidden" name="listId" value={id} />
              ))}
            </GiftEditor>
          ) : (
            <PasteBar
              onResult={handleResult}
              onManual={() => setEditing({ draft: EMPTY_DRAFT, notice: null })}
            />
          )}
        </div>
      )}
    </Sheet>
  );
}

function NewListSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <Sheet open={open} onClose={onClose} title={t("list.new.title")}>
      <div className="pb-2">
        {/* createListAction stuurt je meteen door naar de nieuwe lijst; het
            paneel gaat vanzelf dicht zodra het adres verandert. */}
        <ListForm
          action={createListAction}
          submitLabel={t("list.create")}
          initial={{
            title: "",
            description: "",
            occasion: "OTHER",
            eventDate: "",
            coverColor: "terracotta",
            visibility: "LINK",
          }}
        />
      </div>
    </Sheet>
  );
}

/** In welke lijsten staat dit cadeau? Aan- en uitvinken zet het erin of eruit. */
function GiftListsSheet({
  open,
  onClose,
  lists,
  gift,
}: {
  open: boolean;
  onClose: () => void;
  lists: PickableList[];
  gift: GiftInLists | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(gift?.listIds ?? []);
  const [busy, start] = useTransition();

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  }

  function save() {
    if (!gift || selected.length === 0) return;
    start(async () => {
      const data = new FormData();
      data.set("giftId", gift.id);
      for (const id of selected) data.append("listId", id);
      await setGiftListsAction({}, data);
      onClose();
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("gift.inLists")}>
      <div className="space-y-4 pb-2">
        <p className="text-sm text-muted">{t("gift.inListsBody")}</p>
        {gift && (
          <p className="font-semibold text-ink">{gift.title}</p>
        )}

        <ListPicker
          lists={lists}
          selected={selected}
          onToggle={toggle}
          label={false}
        />

        <button
          type="button"
          className="btn btn-primary w-full sm:w-auto"
          onClick={save}
          disabled={busy || selected.length === 0}
        >
          {busy ? t("common.loading") : t("common.save")}
        </button>
      </div>
    </Sheet>
  );
}
