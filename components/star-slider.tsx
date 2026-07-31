"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

export const MAX_PRIORITY = 5;

/** Eén ster, gevuld of leeg. */
function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`size-8 shrink-0 transition-colors ${
        filled ? "text-accent" : "text-line"
      }`}
      fill="currentColor"
    >
      <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9L12 2.6Z" />
    </svg>
  );
}

/** Vijf sterren naast elkaar, zonder bediening. Voor kaartjes en overzichten. */
export function Stars({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: MAX_PRIORITY }, (_, index) => (
        <Star key={index} filled={index < value} />
      ))}
    </span>
  );
}

/**
 * Hoe graag wil je dit? Een schuif in de vorm van vijf sterren: verder schuiven
 * kleurt er meer in.
 *
 * Onder de sterren ligt een gewone `input[type=range]`. Die is doorzichtig maar
 * niet weggehaald: zo werkt slepen, tikken én het toetsenbord vanzelf, en komt
 * de waarde gewoon met het formulier mee.
 */
export function StarSlider({
  name = "priority",
  defaultValue,
}: {
  name?: string;
  defaultValue: number;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="relative flex h-11 items-center">
      <div className="pointer-events-none flex gap-1">
        {Array.from({ length: MAX_PRIORITY }, (_, index) => (
          <Star key={index} filled={index < value} />
        ))}
      </div>
      <input
        type="range"
        name={name}
        min={1}
        max={MAX_PRIORITY}
        step={1}
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        aria-label={t("gift.field.priority")}
        aria-valuetext={t("priority.stars", {
          count: value,
          max: MAX_PRIORITY,
        })}
        className="absolute inset-y-0 left-0 m-0 h-full w-[calc(5*2rem+4*0.25rem)] cursor-pointer opacity-0"
      />
    </div>
  );
}
