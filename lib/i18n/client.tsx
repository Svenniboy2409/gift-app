"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  type Locale,
  type Translator,
  createTranslator,
  getMessages,
} from "@/lib/i18n";

const LocaleContext = createContext<{ locale: Locale; t: Translator }>({
  locale: DEFAULT_LOCALE,
  t: createTranslator(getMessages(DEFAULT_LOCALE)),
});

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ locale, t: createTranslator(getMessages(locale)) }),
    [locale],
  );
  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

/** Vertaalfunctie voor client components. */
export function useI18n() {
  return useContext(LocaleContext);
}
