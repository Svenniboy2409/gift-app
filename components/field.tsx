"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

/**
 * Een invulbalk met een kruisje om hem in één tik leeg te maken.
 *
 * Het kruisje verschijnt pas zodra er iets in staat — bij een lege balk zou
 * het alleen maar in de weg zitten. Vooral bij het datumveld scheelt het: een
 * datum tik je niet, die kies je, en zonder kruisje kom je er bijna niet meer
 * vanaf.
 *
 * De balken in de app zijn "ongecontroleerd": ze krijgen een `defaultValue` en
 * de browser houdt de rest bij. Leegmaken is daarom niet simpelweg de waarde
 * op "" zetten in React — zie `maakLeeg` hieronder.
 */

function KruisIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

/**
 * Maak een veld leeg zodat React het ook merkt.
 *
 * `node.value = ""` alleen is niet genoeg: React onthoudt de laatst bekende
 * waarde op het element en slaat de gebeurtenis dan over, waardoor een
 * gecontroleerd veld meteen weer terugspringt. Via de oorspronkelijke setter
 * van de browser omzeilen we dat geheugen, en daarna stoten we zelf een
 * `input` af zodat alles wat meeluistert bijblijft.
 */
function maakLeeg(node: HTMLInputElement | HTMLTextAreaElement) {
  const prototype =
    node instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (setter) setter.call(node, "");
  else node.value = "";
  node.dispatchEvent(new Event("input", { bubbles: true }));
  node.focus();
}

/**
 * Twee verwijzingen naar hetzelfde veld: die van ons, om het leeg te kunnen
 * maken, en die van degene die het veld gebruikt — het bewerkscherm zet de
 * cursor er bijvoorbeeld in.
 */
function koppel<T>(eigen: React.RefObject<T | null>, extern?: React.Ref<T>) {
  return (node: T | null) => {
    eigen.current = node;
    if (typeof extern === "function") extern(node);
    else if (extern) extern.current = node;
  };
}

function heeftInhoud(waarde: unknown) {
  return typeof waarde === "string" || typeof waarde === "number"
    ? String(waarde).length > 0
    : false;
}

type WisKnopProps = {
  /** Bij een tekstvak hoort het kruisje bovenin, niet in het midden. */
  bovenaan?: boolean;
  onClick: () => void;
  label: string;
};

function WisKnop({ bovenaan, onClick, label }: WisKnopProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      // De hele rechterrand is aanraakbaar; een klein rondje is op een telefoon
      // lastig te raken.
      className={`absolute right-0 flex w-10 items-center justify-center text-subtle transition-colors hover:text-ink ${
        bovenaan ? "top-0 h-11" : "inset-y-0"
      }`}
    >
      <KruisIcon />
    </button>
  );
}

export function Field({
  className = "field",
  onInput,
  ref,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  ref?: React.Ref<HTMLInputElement>;
}) {
  const { t } = useI18n();
  const veld = useRef<HTMLInputElement>(null);
  const [gevuld, setGevuld] = useState(
    heeftInhoud(rest.defaultValue ?? rest.value),
  );

  return (
    <div className="relative">
      <input
        ref={koppel(veld, ref)}
        // De ruimte rechts staat er altijd, ook als het kruisje er nog niet is:
        // anders verspringt je tekst zodra je de eerste letter typt.
        className={`${className} pr-10`}
        onInput={(event) => {
          setGevuld(event.currentTarget.value.length > 0);
          onInput?.(event);
        }}
        {...rest}
      />
      {gevuld && (
        <WisKnop
          label={t("common.clear")}
          onClick={() => {
            if (veld.current) maakLeeg(veld.current);
            setGevuld(false);
          }}
        />
      )}
    </div>
  );
}

export function TextArea({
  className = "field",
  onInput,
  ref,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  ref?: React.Ref<HTMLTextAreaElement>;
}) {
  const { t } = useI18n();
  const veld = useRef<HTMLTextAreaElement>(null);
  const [gevuld, setGevuld] = useState(
    heeftInhoud(rest.defaultValue ?? rest.value),
  );

  return (
    <div className="relative">
      <textarea
        ref={koppel(veld, ref)}
        className={`${className} pr-10`}
        onInput={(event) => {
          setGevuld(event.currentTarget.value.length > 0);
          onInput?.(event);
        }}
        {...rest}
      />
      {gevuld && (
        <WisKnop
          bovenaan
          label={t("common.clear")}
          onClick={() => {
            if (veld.current) maakLeeg(veld.current);
            setGevuld(false);
          }}
        />
      )}
    </div>
  );
}
