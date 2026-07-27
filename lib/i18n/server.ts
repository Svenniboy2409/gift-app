import "server-only";

import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  type Locale,
  createTranslator,
  getMessages,
  isLocale,
} from "@/lib/i18n";

/** De actieve taal, uit het cookie. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function setLocaleCookie(locale: Locale) {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 365 * 24 * 60 * 60,
  });
}

/** Vertaalfunctie voor server components. */
export async function getTranslator() {
  const locale = await getLocale();
  return { locale, t: createTranslator(getMessages(locale)) };
}
