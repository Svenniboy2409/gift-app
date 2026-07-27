"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { claimGiftAction, releaseClaimAction } from "@/lib/actions/claims";
import type { FormState } from "@/lib/actions/auth";
import type { VisitorGift } from "@/lib/gifts";
import { formatPrice, type MessageKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

function ClaimSubmit() {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
      {pending ? t("common.loading") : t("visitor.claimSubmit")}
    </button>
  );
}

function ClaimForm({
  gift,
  shareCode,
  available,
  defaultName,
  onDone,
  onCancel,
}: {
  gift: VisitorGift;
  shareCode: string;
  available: number;
  defaultName: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [state, formAction] = useActionState<FormState, FormData>(
    claimGiftAction.bind(null, shareCode),
    {},
  );

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  return (
    <form action={formAction} className="animate-in mt-3 space-y-3 rounded-xl bg-sunken p-3">
      <input type="hidden" name="giftId" value={gift.id} />

      <div>
        <label className="label" htmlFor={`claim-name-${gift.id}`}>
          {t("visitor.claimName")}
        </label>
        <input
          id={`claim-name-${gift.id}`}
          name="name"
          className="field"
          defaultValue={defaultName}
          placeholder={t("visitor.claimNamePlaceholder")}
          required
          maxLength={60}
          autoFocus
        />
      </div>

      {available > 1 && (
        <div>
          <label className="label" htmlFor={`claim-qty-${gift.id}`}>
            {t("visitor.claimQuantity")}
          </label>
          <input
            id={`claim-qty-${gift.id}`}
            name="quantity"
            type="number"
            min={1}
            max={available}
            defaultValue={1}
            className="field"
          />
        </div>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {t(`error.${state.error}` as MessageKey)}
        </p>
      )}

      <div className="flex gap-2">
        <ClaimSubmit />
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          {t("gift.cancel")}
        </button>
      </div>
    </form>
  );
}

export function VisitorGiftCard({
  gift,
  shareCode,
  defaultName,
}: {
  gift: VisitorGift;
  shareCode: string;
  defaultName: string;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const price = formatPrice(gift.priceCents, gift.currency, locale);
  const available = Math.max(0, gift.quantity - gift.claimedCount);
  const soldOut = available === 0;

  function release() {
    const data = new FormData();
    data.set("giftId", gift.id);
    data.set("shareCode", shareCode);
    startTransition(async () => {
      await releaseClaimAction(data);
      router.refresh();
    });
  }

  return (
    <li
      className={`card card-hover flex flex-col overflow-hidden transition-opacity ${
        pending ? "opacity-50" : ""
      } ${soldOut && !gift.myClaim ? "opacity-70" : ""}`}
    >
      <div className="relative aspect-[4/3] shrink-0 border-b border-line bg-sunken">
        {gift.imageUrl ? (
          <Image
            src={gift.imageUrl}
            alt={gift.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-contain p-3"
            unoptimized
          />
        ) : (
          <span className="flex size-full items-center justify-center text-sm text-subtle">
            {t("gift.noImage")}
          </span>
        )}
        {gift.priority === 3 && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-[var(--accent-text)]">
            {t("priority.3")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold leading-snug text-ink">{gift.title}</h3>

        {gift.note && <p className="mt-1 text-sm text-muted">{gift.note}</p>}
        {gift.description && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-subtle">
            {gift.description}
          </p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {price && <span className="chip bg-accent-soft text-accent">{price}</span>}
          {gift.merchant && <span className="chip">{gift.merchant}</span>}
          {gift.quantity > 1 && (
            <span className="chip">
              {soldOut
                ? t("visitor.soldOut")
                : t("visitor.available", {
                    count: available,
                    total: gift.quantity,
                  })}
            </span>
          )}
        </div>

        {/* Claim-status. De eigenaar van de lijst krijgt dit nooit te zien:
            de serverfunctie getListForOwner haalt claims niet eens op. */}
        {(gift.myClaim || gift.claimedByOthers.length > 0) && (
          <div className="mt-3 space-y-1">
            {gift.myClaim && (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="size-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                </svg>
                {t("visitor.claimedByYou")}
              </p>
            )}
            {gift.claimedByOthers.map((claim, index) => (
              <p key={index} className="text-sm text-muted">
                {t("visitor.claimedBy", { name: claim.name })}
              </p>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
          {gift.url && (
            <a
              href={gift.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="btn btn-secondary btn-sm"
            >
              {t("gift.viewInShop")}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5v5M19 5l-8 8M17 14v5H5V7h5" />
              </svg>
            </a>
          )}

          {gift.myClaim ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={release}
              disabled={pending}
            >
              {t("visitor.release")}
            </button>
          ) : soldOut ? (
            <span className="chip">{t("visitor.soldOut")}</span>
          ) : (
            !open && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setOpen(true)}
              >
                {t("visitor.claim")}
              </button>
            )
          )}
        </div>

        {open && !gift.myClaim && !soldOut && (
          <ClaimForm
            gift={gift}
            shareCode={shareCode}
            available={available}
            defaultName={defaultName}
            onDone={() => {
              setOpen(false);
              router.refresh();
            }}
            onCancel={() => setOpen(false)}
          />
        )}
      </div>
    </li>
  );
}
