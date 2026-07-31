"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  deleteGiftAction,
  moveGiftAction,
  updateGiftAction,
} from "@/lib/actions/gifts";
import { formatPrice } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { AddGiftButton } from "@/components/add-buttons";
import { useSheets } from "@/components/sheets";
import {
  GiftEditor,
  centsToInput,
  type GiftDraft,
} from "@/components/gift-editor";

export type OwnerGift = {
  id: string;
  /** Exemplaren van hetzelfde cadeau in andere lijsten delen deze code. */
  groupId: string;
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
  | { mode: "edit"; giftId: string; draft: GiftDraft };

function ShopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="size-4">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
      />
    </svg>
  );
}

function ListsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="size-4">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 6h12M8 12h12M8 18h6M3.5 6h.01M3.5 12h.01M3.5 18h.01M17 16v6M14 19h6"
      />
    </svg>
  );
}

function ArrowIcon({ up = false }: { up?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`size-4 ${up ? "" : "rotate-180"}`}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="size-4">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"
      />
    </svg>
  );
}

function GiftRow({
  gift,
  index,
  order,
  listId,
  listIds,
  onEdit,
}: {
  gift: OwnerGift;
  index: number;
  /** Alle cadeau-id's in de huidige volgorde, om te kunnen verplaatsen. */
  order: string[];
  listId: string;
  /** In welke lijsten dit cadeau al staat. */
  listIds: string[];
  onEdit: () => void;
}) {
  const { t, locale } = useI18n();
  const { openGiftLists } = useSheets();
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
          {/* Alleen de sterren die je gaf; de rest zou als lege plekken lezen. */}
          <span className="chip" title={t("gift.field.priority")}>
            {"★".repeat(gift.priority)}
          </span>
          {gift.quantity > 1 && <span className="chip">{gift.quantity}×</span>}
          {gift.merchant && <span className="chip">{gift.merchant}</span>}
        </div>

        {/* Op een telefoon passen vijf tekstknoppen niet naast elkaar; alles
            wat vanzelf spreekt wordt daar een icoon, en pas op een breed
            scherm komt het bijschrift erbij. */}
        <div className="mt-3 flex items-center gap-1">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>
            {t("gift.edit")}
          </button>
          {gift.url && (
            <a
              href={gift.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="btn btn-ghost btn-sm"
              aria-label={t("gift.viewInShop")}
              title={t("gift.viewInShop")}
            >
              <ShopIcon />
              <span className="hidden sm:inline">{t("gift.viewInShop")}</span>
            </a>
          )}

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() =>
              openGiftLists({
                id: gift.id,
                title: gift.title,
                listIds: listIds.length > 0 ? listIds : [listId],
              })
            }
            aria-label={t("gift.inListsOpen")}
            title={t("gift.inListsOpen")}
          >
            <ListsIcon />
            <span className="hidden sm:inline">{t("gift.inListsOpen")}</span>
          </button>

          <div className="flex-1" />

          <button
            type="button"
            className="btn btn-ghost btn-sm px-2"
            onClick={() => move(-1)}
            disabled={index === 0 || pending}
            aria-label={t("gift.moveUp")}
            title={t("gift.moveUp")}
          >
            <ArrowIcon up />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm px-2"
            onClick={() => move(1)}
            disabled={index === order.length - 1 || pending}
            aria-label={t("gift.moveDown")}
            title={t("gift.moveDown")}
          >
            <ArrowIcon />
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm px-2"
            onClick={remove}
            disabled={pending}
            aria-label={t("gift.delete")}
            title={t("gift.delete")}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </li>
  );
}

export function GiftManager({
  listId,
  gifts,
  listIdsByGroup,
}: {
  listId: string;
  gifts: OwnerGift[];
  /** Per groupId: in welke lijsten dat cadeau staat. */
  listIdsByGroup: Record<string, string[]>;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>({ mode: "closed" });

  const close = useCallback(() => setEditing({ mode: "closed" }), []);
  const done = useCallback(() => {
    setEditing({ mode: "closed" });
    router.refresh();
  }, [router]);

  return (
    <div className="space-y-4">
      {/* Toevoegen gaat via het schuifpaneel. Op de telefoon zit die knop in
          de balk onderaan; op een breed scherm hoort hij hier. */}
      <div className="hidden justify-end md:flex">
        <AddGiftButton />
      </div>

      {gifts.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-12 text-center sm:py-14">
          <h2 className="font-semibold text-ink">{t("gift.empty.title")}</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted">
            {t("gift.empty.body")}
          </p>
          <AddGiftButton className="mt-6" />
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
                listIds={listIdsByGroup[gift.groupId] ?? [listId]}
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
