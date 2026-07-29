import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getTranslator } from "@/lib/i18n/server";
import { logoutAction } from "@/lib/actions/auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme";
import { Logo } from "@/components/logo";

export async function SiteHeader() {
  const [user, { t }] = await Promise.all([getCurrentUser(), getTranslator()]);

  return (
    <header
      className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur"
      // De inkeping van de telefoon: in liggende stand loopt de balk anders
      // onder de camera door.
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6">
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center gap-2 font-semibold tracking-tight text-ink"
        >
          <Logo />
          <span>{t("app.name")}</span>
        </Link>

        <div className="flex-1" />

        {/* Taalkeuze staat op een telefoon in de instellingen: bovenin is de
            ruimte te kostbaar, en je wisselt hem hooguit één keer. */}
        <span className="hidden sm:inline-flex">
          <LanguageSwitcher />
        </span>
        <ThemeToggle />

        {user ? (
          <>
            <Link href="/dashboard" className="btn btn-ghost btn-sm hidden md:inline-flex">
              {t("nav.dashboard")}
            </Link>
            <Link href="/settings" className="btn btn-ghost btn-sm hidden md:inline-flex">
              {t("nav.settings")}
            </Link>
            <form action={logoutAction} className="hidden md:block">
              <button type="submit" className="btn btn-secondary btn-sm">
                {t("nav.logout")}
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-ghost btn-sm">
              {t("nav.login")}
            </Link>
            <Link href="/register" className="btn btn-primary btn-sm">
              {t("nav.register")}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

/**
 * De kop voor pagina's zonder navigatie: een gedeelde lijst, een profiel, het
 * bewaarscherm. Alleen de naam van de app en de knoppen voor taal en thema.
 */
export async function PlainHeader({ href }: { href?: string }) {
  const { t } = await getTranslator();

  const brand = (
    <span className="flex items-center gap-2 font-semibold tracking-tight text-ink">
      <Logo />
      {t("app.name")}
    </span>
  );

  return (
    <header
      className="border-b border-line"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6">
        {href ? <Link href={href}>{brand}</Link> : brand}
        <div className="flex-1" />
        <span className="hidden sm:inline-flex">
          <LanguageSwitcher />
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const { t } = await getTranslator();
  return (
    <footer className="mt-auto border-t border-line py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 px-4 text-center text-sm text-subtle sm:px-6">
        <div className="flex items-center gap-2">
          <Logo className="size-5" />
          <span className="font-medium text-muted">{t("app.name")}</span>
        </div>
        <p>{t("footer.made")}</p>
      </div>
    </footer>
  );
}
