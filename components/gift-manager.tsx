"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
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

/**
 * Loopt onze eigen volgorde nog voor op die van de server?
 *
 * Zolang dat zo is, laten we op het scherm zien wat de gebruiker net heeft
 * gedaan. Weet de server het inmiddels ook, dan geven we het stuur weer uit
 * handen. Cadeaus die wij niet kennen (net toegevoegd) of die wij net hebben
 * weggehaald maken niet uit: we kijken alleen naar de cadeaus die in allebei
 * voorkomen.
 */
function looptVoor(order: string[], serverIds: string[]) {
  const bekend = new Set(serverIds);
  if (!order.every((id) => bekend.has(id))) return false;

  const mijn = new Set(order);
  const serverVolgorde = serverIds.filter((id) => mijn.has(id));
  return serverVolgorde.some((id, index) => id !== order[index]);
}

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
  count,
  listId,
  listIds,
  onEdit,
  onMove,
  onRemove,
}: {
  gift: OwnerGift;
  index: number;
  /** Hoeveel cadeaus er in beeld staan; bepaalt of de pijltjes nog kunnen. */
  count: number;
  listId: string;
  /** In welke lijsten dit cadeau al staat. */
  listIds: string[];
  onEdit: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const { t, locale } = useI18n();
  const { openGiftLists } = useSheets();
  const price = formatPrice(gift.priceCents, gift.currency, locale);

  return (
    <li className="card card-hover flex gap-4 p-4">
      {/* Bewerken staat onder de foto: dan houden de andere knoppen samen één
          regel, ook op een telefoon. */}
      <div className="flex w-20 shrink-0 flex-col gap-2 sm:w-24">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-line bg-sunken">
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
        <button
          type="button"
          className="btn btn-secondary btn-sm w-full px-2"
          onClick={onEdit}
        >
          {t("gift.edit")}
        </button>
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

        {/* Wat vanzelf spreekt is op een telefoon een icoon; pas op een breed
            scherm komt het bijschrift erbij. Ze staan gelijk verdeeld over de
            regel, zodat er geen gat middenin valt. */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-1">
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

          <button
            type="button"
            className="btn btn-ghost btn-sm px-2"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label={t("gift.moveUp")}
            title={t("gift.moveUp")}
          >
            <ArrowIcon up />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm px-2"
            onClick={() => onMove(1)}
            disabled={index === count - 1}
            aria-label={t("gift.moveDown")}
            title={t("gift.moveDown")}
          >
            <ArrowIcon />
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm px-2"
            onClick={onRemove}
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

  /**
   * Verschuiven en weggooien gebeuren meteen op het scherm; het opslaan loopt
   * er op de achtergrond achteraan. Je hoeft dus nergens op te wachten en kunt
   * gerust drie keer achter elkaar op hetzelfde pijltje drukken.
   */
  const [order, setOrder] = useState<string[] | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);

  const serverIds = gifts.map((gift) => gift.id);

  // Weet de server onze volgorde inmiddels? Dan hoeven we hem niet langer zelf
  // bij te houden.
  const eigenVolgorde = order && looptVoor(order, serverIds) ? order : null;
  if (order && !eigenVolgorde) setOrder(null);

  // Cadeaus die de server ook echt kwijt is, hoeven we niet meer te verbergen.
  if (removed.some((id) => !serverIds.includes(id))) {
    setRemoved(removed.filter((id) => serverIds.includes(id)));
  }

  const perId = new Map(gifts.map((gift) => [gift.id, gift]));
  const ordered = eigenVolgorde
    ? [
        ...eigenVolgorde.map((id) => perId.get(id)!),
        // Cadeaus die er ondertussen bij zijn gekomen sluiten achteraan aan.
        ...gifts.filter((gift) => !eigenVolgorde.includes(gift.id)),
      ]
    : gifts;
  const shown =
    removed.length > 0
      ? ordered.filter((gift) => !removed.includes(gift.id))
      : ordered;

  /**
   * De browser stuurt serveracties één voor één. Klik je snel achter elkaar,
   * dan heeft het geen zin elke tussenstand apart op te sturen: we bewaren
   * alleen de laatste en sturen die zodra de vorige klaar is.
   */
  const bezig = useRef(false);
  const wachtrij = useRef<string[] | null>(null);

  const bewaarVolgorde = useCallback(
    async (ids: string[]) => {
      if (bezig.current) {
        wachtrij.current = ids;
        return;
      }
      bezig.current = true;
      try {
        let volgende: string[] | null = ids;
        while (volgende) {
          const data = new FormData();
          data.set("listId", listId);
          data.set("order", volgende.join(","));
          await moveGiftAction(data);
          volgende = wachtrij.current;
          wachtrij.current = null;
        }
      } catch {
        // Niet gelukt: terug naar wat de server weet, anders denk je ten
        // onrechte dat het bewaard is.
        wachtrij.current = null;
        setOrder(null);
        router.refresh();
      } finally {
        bezig.current = false;
      }
    },
    [listId, router],
  );

  function move(giftId: string, direction: -1 | 1) {
    const ids = shown.map((gift) => gift.id);
    const from = ids.indexOf(giftId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= ids.length) return;

    const next = [...ids];
    [next[from], next[to]] = [next[to], next[from]];
    setOrder(next);
    void bewaarVolgorde(next);
  }

  async function remove(giftId: string) {
    if (!window.confirm(t("gift.deleteConfirm"))) return;
    setRemoved((eerder) => [...eerder, giftId]);

    const data = new FormData();
    data.set("giftId", giftId);
    data.set("listId", listId);
    try {
      await deleteGiftAction(data);
    } catch {
      setRemoved((eerder) => eerder.filter((id) => id !== giftId));
      router.refresh();
    }
  }

  // Opslaan laat de pagina zelf al opnieuw tekenen; hier hoeven we het
  // bewerkscherm alleen nog dicht te doen.
  const close = useCallback(() => setEditing({ mode: "closed" }), []);

  return (
    <div className="space-y-4">
      {/* Toevoegen gaat via het schuifpaneel. Op de telefoon zit die knop in
          de balk onderaan; op een breed scherm hoort hij hier. */}
      <div className="hidden justify-end md:flex">
        <AddGiftButton />
      </div>

      {shown.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-12 text-center sm:py-14">
          <h2 className="font-semibold text-ink">{t("gift.empty.title")}</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted">
            {t("gift.empty.body")}
          </p>
          <AddGiftButton className="mt-6" />
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((gift, index) =>
            editing.mode === "edit" && editing.giftId === gift.id ? (
              <li key={gift.id} className="card p-5">
                <GiftEditor
                  draft={editing.draft}
                  action={updateGiftAction.bind(null, listId, gift.id)}
                  onDone={close}
                  onCancel={close}
                />
              </li>
            ) : (
              <GiftRow
                key={gift.id}
                gift={gift}
                index={index}
                count={shown.length}
                listId={listId}
                listIds={listIdsByGroup[gift.groupId] ?? [listId]}
                onMove={(direction) => move(gift.id, direction)}
                onRemove={() => remove(gift.id)}
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
