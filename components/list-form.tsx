"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";
import { OCCASIONS, VISIBILITIES } from "@/lib/validation";

const COVER_COLORS = [
  "terracotta",
  "olive",
  "plum",
  "ocean",
  "amber",
  "rose",
] as const;

export type ListFormValues = {
  title: string;
  description: string;
  occasion: string;
  eventDate: string;
  coverColor: string;
  visibility: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? t("common.loading") : label}
    </button>
  );
}

export function ListForm({
  action,
  initial,
  submitLabel,
  children,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial: ListFormValues;
  submitLabel: string;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const [color, setColor] = useState(initial.coverColor);
  const [visibility, setVisibility] = useState(initial.visibility);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="label" htmlFor="title">
          {t("list.field.title")}
        </label>
        <input
          id="title"
          name="title"
          className="field"
          defaultValue={initial.title}
          placeholder={t("list.field.titlePlaceholder")}
          required
          maxLength={80}
        />
      </div>

      <div>
        <label className="label" htmlFor="description">
          {t("list.field.description")}{" "}
          <span className="font-normal text-subtle">({t("common.optional")})</span>
        </label>
        <textarea
          id="description"
          name="description"
          className="field min-h-20 resize-y"
          defaultValue={initial.description}
          placeholder={t("list.field.descriptionPlaceholder")}
          maxLength={500}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="occasion">
            {t("list.field.occasion")}
          </label>
          <select
            id="occasion"
            name="occasion"
            className="field"
            defaultValue={initial.occasion}
          >
            {OCCASIONS.map((occasion) => (
              <option key={occasion} value={occasion}>
                {t(`occasion.${occasion}` as MessageKey)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="eventDate">
            {t("list.field.eventDate")}{" "}
            <span className="font-normal text-subtle">({t("common.optional")})</span>
          </label>
          <input
            id="eventDate"
            name="eventDate"
            type="date"
            className="field"
            defaultValue={initial.eventDate}
          />
        </div>
      </div>

      <div>
        <span className="label">{t("list.field.coverColor")}</span>
        <input type="hidden" name="coverColor" value={color} />
        <div className="flex flex-wrap gap-2.5">
          {COVER_COLORS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setColor(option)}
              aria-pressed={color === option}
              title={t(`color.${option}` as MessageKey)}
              className={`cover-${option} size-9 rounded-full transition-transform ${
                color === option
                  ? "ring-2 ring-accent ring-offset-2 ring-offset-[var(--surface-raised)]"
                  : "hover:scale-105"
              }`}
            >
              <span className="sr-only">{t(`color.${option}` as MessageKey)}</span>
            </button>
          ))}
        </div>
      </div>

      <fieldset>
        <legend className="label">{t("list.field.visibility")}</legend>
        <div className="space-y-2">
          {VISIBILITIES.map((option) => (
            <label
              key={option}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                visibility === option
                  ? "border-accent bg-accent-soft"
                  : "border-line hover:bg-sunken"
              }`}
            >
              <input
                type="radio"
                name="visibility"
                value={option}
                checked={visibility === option}
                onChange={() => setVisibility(option)}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span className="text-sm">
                <span className="block font-semibold text-ink">
                  {t(`visibility.${option}` as MessageKey)}
                </span>
                <span className="text-muted">
                  {t(`visibility.${option}.hint` as MessageKey)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {t(`error.${state.error}` as MessageKey)}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
          {t("settings.saved")}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <SubmitButton label={submitLabel} />
        {children}
      </div>
    </form>
  );
}
