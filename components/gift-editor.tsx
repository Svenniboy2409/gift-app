"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/actions/auth";
import { compressImage } from "@/lib/image-compress";
import { useI18n } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";

export type GiftDraft = {
  id?: string;
  title: string;
  description: string;
  note: string;
  price: string;
  currency: string;
  url: string;
  merchant: string;
  imageUrl: string;
  priority: number;
  quantity: number;
};

export const EMPTY_DRAFT: GiftDraft = {
  title: "",
  description: "",
  note: "",
  price: "",
  currency: "EUR",
  url: "",
  merchant: "",
  imageUrl: "",
  priority: 2,
  quantity: 1,
};

/** Centen → bewerkbare tekst ("4995" → "49,95"). */
export function centsToInput(cents: number | null, locale: string) {
  if (cents === null) return "";
  const value = (cents / 100).toFixed(2);
  return locale === "nl" ? value.replace(".", ",") : value;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? t("common.loading") : t("gift.save")}
    </button>
  );
}

/**
 * Formulier voor één cadeau. Wordt zowel gebruikt na het uitlezen van een link
 * (alles al ingevuld) als voor handmatig toevoegen en bewerken.
 */
export function GiftEditor({
  draft,
  action,
  onDone,
  onCancel,
  notice,
  children,
  cancelLabel,
  imageChoices,
}: {
  draft: GiftDraft;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  onDone: () => void;
  onCancel: () => void;
  notice?: string | null;
  /** Extra velden bovenaan het formulier, zoals de lijstkeuze. */
  children?: React.ReactNode;
  cancelLabel?: string;
  /** Andere foto's van de pagina, om er zelf een uit te kiezen. */
  imageChoices?: string[];
}) {
  const { t } = useI18n();
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const [imageUrl, setImageUrl] = useState(draft.imageUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleInput.current?.focus();
  }, []);

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  async function upload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      // Telefoonfoto's zijn al gauw enkele megabytes. Die verkleinen we hier,
      // vóór het versturen: dat scheelt wachttijd, opslag, en het houdt de
      // upload onder de grens die de server aanhoudt.
      const prepared = await compressImage(file);

      const body = new FormData();
      body.set("file", prepared);
      const response = await fetch("/api/upload", { method: "POST", body });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "upload-failed");
      }
      const data = (await response.json()) as { url: string };
      setImageUrl(data.url);
    } catch (error) {
      const reason = (error as Error).message;
      setUploadError(
        reason === "storage-unconfigured"
          ? t("error.storage-unconfigured")
          : reason === "too-large"
            ? t("error.image-too-large")
            : t("error.generic"),
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="animate-in space-y-4">
      {notice && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
          {notice}
        </p>
      )}

      {children}

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="sm:w-40 sm:shrink-0">
          <span className="label">{t("gift.field.image")}</span>
          <input type="hidden" name="imageUrl" value={imageUrl} />
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-line bg-sunken">
            {uploading ? (
              <div className="skeleton size-full" />
            ) : imageUrl ? (
              <Image
                src={imageUrl}
                alt=""
                fill
                sizes="160px"
                className="object-contain p-2"
                unoptimized
              />
            ) : (
              <span className="flex size-full items-center justify-center px-2 text-center text-xs text-subtle">
                {t("gift.noImage")}
              </span>
            )}
          </div>
          {imageChoices && imageChoices.length > 1 && (
            <div className="mt-2">
              <span className="label">{t("gift.otherPhotos")}</span>
              <div className="flex flex-wrap gap-1.5">
                {imageChoices.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setImageUrl(choice)}
                    aria-pressed={choice === imageUrl}
                    className={`relative size-12 overflow-hidden rounded-lg border bg-sunken transition-colors ${
                      choice === imageUrl
                        ? "border-accent ring-2 ring-accent"
                        : "border-line hover:border-line-strong"
                    }`}
                  >
                    <Image
                      src={choice}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-contain p-0.5"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              {t("gift.uploadImage")}
            </button>
            {imageUrl && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setImageUrl("")}
              >
                {t("gift.removeImage")}
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
          {uploadError && (
            <p className="mt-1 text-xs text-danger">{uploadError}</p>
          )}
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <label className="label" htmlFor="gift-title">
              {t("gift.field.title")}
            </label>
            <input
              ref={titleInput}
              id="gift-title"
              name="title"
              className="field"
              defaultValue={draft.title}
              required
              maxLength={160}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="gift-price">
                {t("gift.field.price")}{" "}
                <span className="font-normal text-subtle">
                  ({t("common.optional")})
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  id="gift-price"
                  name="price"
                  className="field"
                  defaultValue={draft.price}
                  inputMode="decimal"
                  placeholder="0,00"
                />
                <select
                  name="currency"
                  className="field w-24 shrink-0"
                  defaultValue={draft.currency}
                  aria-label="Valuta"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="CHF">CHF</option>
                  <option value="SEK">SEK</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="gift-quantity">
                {t("gift.field.quantity")}
              </label>
              <input
                id="gift-quantity"
                name="quantity"
                type="number"
                min={1}
                max={99}
                className="field"
                defaultValue={draft.quantity}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="gift-url">
              {t("gift.field.url")}{" "}
              <span className="font-normal text-subtle">({t("common.optional")})</span>
            </label>
            <input
              id="gift-url"
              name="url"
              type="url"
              className="field"
              defaultValue={draft.url}
              placeholder="https://"
            />
            <input type="hidden" name="merchant" value={draft.merchant} />
          </div>

          <div>
            <label className="label" htmlFor="gift-note">
              {t("gift.field.note")}{" "}
              <span className="font-normal text-subtle">({t("common.optional")})</span>
            </label>
            <input
              id="gift-note"
              name="note"
              className="field"
              defaultValue={draft.note}
              placeholder={t("gift.field.notePlaceholder")}
              maxLength={300}
            />
          </div>

          <div>
            <span className="label">{t("gift.field.priority")}</span>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((level) => (
                <label
                  key={level}
                  className="cursor-pointer"
                  title={t(`priority.${level}` as MessageKey)}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={level}
                    defaultChecked={draft.priority === level}
                    className="peer sr-only"
                  />
                  <span className="chip border border-line px-3 py-1.5 peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent">
                    {"★".repeat(level)}{" "}
                    {t(`priority.${level}` as MessageKey)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="gift-description">
              {t("gift.field.description")}{" "}
              <span className="font-normal text-subtle">({t("common.optional")})</span>
            </label>
            <textarea
              id="gift-description"
              name="description"
              className="field min-h-16 resize-y"
              defaultValue={draft.description}
              maxLength={600}
            />
          </div>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {t(`error.${state.error}` as MessageKey)}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <SubmitButton />
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          {cancelLabel ?? t("gift.cancel")}
        </button>
      </div>
    </form>
  );
}
