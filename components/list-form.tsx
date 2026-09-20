"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";
import { OCCASIONS, VISIBILITIES } from "@/lib/validation";
import { COVER_COLORS, accentClass } from "@/lib/covers";
import { Field, TextArea } from "@/components/field";

export type ListFormValues = {
  title: string;
  description: string;
  occasion: string;
  /** Bij "Anders": wat de gelegenheid dan wél is. */
  occasionNote: string;
  eventDate: string;
  coverColor: string;
  visibility: string;
};

/**
 * De opslaanknop staat onderaan het formulier, maar dat is op een telefoon een
 * heel eind naar beneden — je opent de instellingen en de knop staat buiten
 * beeld. Daarom blijft hij onderaan het scherm zweven zolang zijn eigen plek
 * nog niet in zicht is, en gaat hij daar staan zodra je er bent.
 *
 * `position: sticky` met `bottom: 0` doet precies dat. Het enige wat ontbreekt
 * is weten wélke van de twee het op dit moment is: zwevend hoort er een randje
 * en een achtergrond omheen, zodat het formulier er niet doorheen schemert, en
 * op zijn eigen plek juist niet. Dat leest een klein onzichtbaar blokje eronder
 * af: is dát in beeld, dan is de knop thuis.
 */
function useZweeft() {
  const baken = useRef<HTMLDivElement>(null);
  const [zweeft, setZweeft] = useState(true);

  useEffect(() => {
    const node = baken.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const kijker = new IntersectionObserver(
      ([blokje]) => setZweeft(!blokje.isIntersecting),
      { threshold: 1 },
    );
    kijker.observe(node);
    return () => kijker.disconnect();
  }, []);

  return { baken, zweeft };
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending}>
      {pending ? t("common.loading") : label}
    </button>
  );
}

export function ListForm({
  action,
  initial,
  submitLabel,
  children,
  onSaved,
  stickySubmit = false,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial: ListFormValues;
  submitLabel: string;
  children?: React.ReactNode;
  /** Wordt aangeroepen zodra het opslaan gelukt is. */
  onSaved?: () => void;
  /**
   * Laat de opslaanknop onderaan het scherm meeschuiven zolang zijn eigen plek
   * nog niet in beeld is. Bedoeld voor het schuifpaneel; op een gewone pagina
   * zou hij onder de navigatiebalk terechtkomen.
   */
  stickySubmit?: boolean;
}) {
  const { t } = useI18n();
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const { baken, zweeft } = useZweeft();
  const [occasion, setOccasion] = useState(initial.occasion);
  const [color, setColor] = useState(initial.coverColor);
  const [visibility, setVisibility] = useState(initial.visibility);

  useEffect(() => {
    if (state.success) onSaved?.();
  }, [state.success, onSaved]);

  return (
    // De gekozen kleur is meteen te zien: de opslaanknop en het vinkje bij de
    // zichtbaarheid kleuren mee terwijl je nog aan het kiezen bent.
    <form action={formAction} className={`${accentClass(color)} space-y-5`}>
      <div>
        <label className="label" htmlFor="title">
          {t("list.field.title")}
        </label>
        <Field
          id="title"
          name="title"
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
        <TextArea
          id="description"
          name="description"
          className="field min-h-20 resize-y"
          defaultValue={initial.description}
          placeholder={t("list.field.descriptionPlaceholder")}
          maxLength={500}
        />
      </div>

      {/* min-w-0: anders rekt een kolom mee met wat erin staat, en valt het
          datumveld op een telefoon buiten het scherm. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <label className="label" htmlFor="occasion">
            {t("list.field.occasion")}
          </label>
          <select
            id="occasion"
            name="occasion"
            className="field"
            value={occasion}
            onChange={(event) => setOccasion(event.target.value)}
          >
            {OCCASIONS.map((optie) => (
              <option key={optie} value={optie}>
                {t(`occasion.${optie}` as MessageKey)}
              </option>
            ))}
          </select>

          {/* Bij "Anders" mag je zelf zeggen waar de lijst voor is. Laat je
              het leeg, dan blijft er gewoon "Anders" staan. */}
          {occasion === "OTHER" && (
            <div className="mt-2">
              <label className="sr-only" htmlFor="occasionNote">
                {t("list.field.occasionNote")}
              </label>
              <Field
                id="occasionNote"
                name="occasionNote"
                defaultValue={initial.occasionNote}
                placeholder={t("list.field.occasionNotePlaceholder")}
                maxLength={40}
              />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <label className="label" htmlFor="eventDate">
            {t("list.field.eventDate")}{" "}
            <span className="font-normal text-subtle">({t("common.optional")})</span>
          </label>
          <Field
            id="eventDate"
            name="eventDate"
            type="date"
            defaultValue={initial.eventDate}
          />
        </div>
      </div>


      <div>
        <span className="label">{t("list.field.coverColor")}</span>
        <input type="hidden" name="coverColor" value={color} />
        {/* Zes per rij, zodat twaalf kleuren twee nette rijen vormen in plaats
            van een rafelige afbreking. */}
        <div className="grid grid-cols-6 justify-items-center gap-2 sm:gap-2.5">
          {COVER_COLORS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setColor(option)}
              aria-pressed={color === option}
              title={t(`color.${option}` as MessageKey)}
              className={`cover-${option} size-10 rounded-full transition-transform sm:size-9 ${
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

      <div
        className={`flex flex-col items-stretch gap-3 pt-1 sm:flex-row sm:items-center ${
          stickySubmit ? "sticky bottom-0 z-10" : ""
        } ${
          stickySubmit && zweeft
            ? "-mx-5 border-t border-line bg-raised px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
            : ""
        }`}
      >
        <SubmitButton label={submitLabel} />
        {children}
      </div>
      {/* Het blokje waaraan de knop merkt of hij thuis is; zie useZweeft. */}
      <div ref={baken} aria-hidden className="h-px" />
    </form>
  );
}
