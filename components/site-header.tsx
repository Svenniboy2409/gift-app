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
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center gap-2 font-semibold tracking-tight text-ink"
        >
          <Logo />
          <span>{t("app.name")}</span>
        </Link>

        <div className="flex-1" />

        <LanguageSwitcher />
        <ThemeToggle />

        {user ? (
          <>
            <Link href="/dashboard" className="btn btn-ghost btn-sm hidden sm:inline-flex">
              {t("nav.dashboard")}
            </Link>
            <Link href="/settings" className="btn btn-ghost btn-sm">
              {t("nav.settings")}
            </Link>
            <form action={logoutAction}>
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
