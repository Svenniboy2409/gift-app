"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { ScrapeResponse } from "@/app/api/scrape/route";
import {
  createGiftAction,
  deleteGiftAction,
  moveGiftAction,
  updateGiftAction,
} from "@/lib/actions/gifts";
import { formatPrice } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import {
  EMPTY_DRAFT,
  GiftEditor,
  centsToInput,
  type GiftDraft,
} from "@/components/gift-editor";

export type OwnerGift = {
  id: string;
  title: string;
  description: string | null;
  note: string | null;
  priceCents: number | null;
  currency: string;
  url: string | null;
  merchant: string | null;
  imageUrl: string | null;
  priority: number;
  quantity: number;
};

type Editing =
  | { mode: "closed" }
  | { mode: "new"; draft: GiftDraft; notice: string | null }
  | { mode: "edit"; giftId: string; draft: GiftDraft };

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4 shrink-0">
      <path
        strokeLinecap="round"
        d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19"
      />
    </svg>
  );
}

/** De plakbalk bovenaan: link erin, gegevens eruit. */
function PasteBar({
  onResult,
  onManual,
  busy,
  setBusy,
}: {
  onResult: (result: ScrapeResponse) => void;
  onManual: () => void;
  busy: boolean;
  setBusy: (value: boolean) => void;
}) {
  const { t } = useI18n();
  const [url, setUrl] = useState("");
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

      const data = (await response.json()) as ScrapeResponse;
      onResult(data);
      setUrl("");
    } catch {
      setError(t("error.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card bg-sunken p-4 sm:p-5">
      <form onSubmit={fetchProduct} className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle">
            <LinkIcon />
          </span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="field pl-10"
            type="text"
            inputMode="url"
            placeholder={t("gift.pastePlaceholder")}
            aria-label={t("gift.pastePlaceholder")}
            disabled={busy}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy || !url.trim()}>
          {busy ? t("gift.fetching") : t("gift.fetch")}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <button type="button" className="btn btn-ghost btn-sm mt-2 -ml-2" onClick={onManual}>
        {t("gift.manual")}
      </button>

      {busy && (
        <div className="mt-4 flex gap-4 rounded-xl bg-raised p-4">
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

function GiftRow({
  gift,
  index,
  order,
  listId,
  onEdit,
}: {
  gift: OwnerGift;
  index: number;
  /** Alle cadeau-id's in de huidige volgorde, om te kunnen verplaatsen. */
  order: string[];
  listId: string;
  onEdit: () => void;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const price = formatPrice(gift.priceCents, gift.currency, locale);

  function run(action: (data: FormData) => Promise<void>, data: FormData) {
    startTransition(async () => {
      await action(data);
      router.refresh();
    });
  }

  function move(direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;

    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];

    const data = new FormData();
    data.set("listId", listId);
    data.set("order", next.join(","));
    run(moveGiftAction, data);
  }

  function remove() {
    if (!window.confirm(t("gift.deleteConfirm"))) return;
    const data = new FormData();
    data.set("giftId", gift.id);
    data.set("listId", listId);
    run(deleteGiftAction, data);
  }

  return (
    <li
      className={`card card-hover flex gap-4 p-4 transition-opacity ${
        pending ? "opacity-50" : ""
      }`}
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-line bg-sunken sm:size-24">
        {gift.imageUrl ? (
          <Image
            src={gift.imageUrl}
            alt=""
            fill
            sizes="96px"
            className="object-contain p-1.5"
            unoptimized
          />
        ) : (
          <span className="flex size-full items-center justify-center px-1 text-center text-[11px] text-subtle">
            {t("gift.noImage")}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="font-semibold leading-snug text-ink">{gift.title}</h3>

        {gift.note && (
          <p className="mt-0.5 text-sm text-muted">{gift.note}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {price && (
            <span className="chip bg-accent-soft text-accent">{price}</span>
          )}
          <span className="chip" title={t("gift.field.priority")}>
            {"★".repeat(gift.priority)}
          </span>
          {gift.quantity > 1 && <span className="chip">{gift.quantity}×</span>}
          {gift.merchant && <span className="chip">{gift.merchant}</span>}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>
            {t("gift.edit")}
          </button>
          {gift.url && (
            <a
              href={gift.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="btn btn-ghost btn-sm"
            >
              {t("gift.viewInShop")}
            </a>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => move(-1)}
            disabled={index === 0 || pending}
            aria-label={t("gift.moveUp")}
            title={t("gift.moveUp")}
          >
            ↑
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => move(1)}
            disabled={index === order.length - 1 || pending}
            aria-label={t("gift.moveDown")}
            title={t("gift.moveDown")}
          >
            ↓
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={remove}
            disabled={pending}
          >
            {t("gift.delete")}
          </button>
        </div>
      </div>
    </li>
  );
}

export function GiftManager({
  listId,
  gifts,
}: {
  listId: string;
  gifts: OwnerGift[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>({ mode: "closed" });
  const [busy, setBusy] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Na het ophalen staat het ingevulde formulier onder de plakbalk; breng het
  // in beeld zodat je meteen ziet wat er gevonden is.
  useEffect(() => {
    if (editing.mode === "new") {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editing.mode]);

  const close = useCallback(() => setEditing({ mode: "closed" }), []);
  const done = useCallback(() => {
    setEditing({ mode: "closed" });
    router.refresh();
  }, [router]);

  function handleScrapeResult(result: ScrapeResponse) {
    const product = result.product;

    // Werd de shop geblokkeerd, dan hebben we hooguit uit de link kunnen
    // afleiden hoe het product heet. Zeg dat dan ook, in plaats van de
    // algemene "niet alles gelukt"-melding.
    const blocked = result.reason === "blocked";
    const notice =
      result.quality === "failed"
        ? t(blocked ? "scrape.blocked" : "scrape.failed")
        : blocked
          ? t("scrape.blockedPartial", {
              shop: product.merchant ?? t("scrape.thisShop"),
            })
          : result.quality === "partial"
            ? t("scrape.partial")
            : null;

    setEditing({
      mode: "new",
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
    <div className="space-y-5">
      <PasteBar
        busy={busy}
        setBusy={setBusy}
        onResult={handleScrapeResult}
        onManual={() =>
          setEditing({ mode: "new", draft: EMPTY_DRAFT, notice: null })
        }
      />

      {editing.mode === "new" && (
        <div ref={editorRef} className="card scroll-mt-20 p-5">
          <h2 className="mb-4 font-semibold text-ink">{t("gift.addTitle")}</h2>
          <GiftEditor
            draft={editing.draft}
            notice={editing.notice}
            action={createGiftAction.bind(null, listId)}
            onDone={done}
            onCancel={close}
          />
        </div>
      )}

      {gifts.length === 0 ? (
        <div className="card px-6 py-14 text-center">
          <h2 className="font-semibold text-ink">{t("gift.empty.title")}</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
            {t("gift.empty.body")}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {gifts.map((gift, index) =>
            editing.mode === "edit" && editing.giftId === gift.id ? (
              <li key={gift.id} className="card p-5">
                <GiftEditor
                  draft={editing.draft}
                  action={updateGiftAction.bind(null, listId, gift.id)}
                  onDone={done}
                  onCancel={close}
                />
              </li>
            ) : (
              <GiftRow
                key={gift.id}
                gift={gift}
                index={index}
                order={gifts.map((item) => item.id)}
                listId={listId}
                onEdit={() =>
                  setEditing({
                    mode: "edit",
                    giftId: gift.id,
                    draft: {
                      id: gift.id,
                      title: gift.title,
                      description: gift.description ?? "",
                      note: gift.note ?? "",
                      price: centsToInput(gift.priceCents, locale),
                      currency: gift.currency,
                      url: gift.url ?? "",
                      merchant: gift.merchant ?? "",
                      imageUrl: gift.imageUrl ?? "",
                      priority: gift.priority,
                      quantity: gift.quantity,
                    },
                  })
                }
              />
            ),
          )}
        </ul>
      )}
    </div>
  );
}
