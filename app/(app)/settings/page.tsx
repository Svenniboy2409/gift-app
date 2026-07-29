import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import { getTranslator } from "@/lib/i18n/server";
import { BookmarkletCard } from "@/components/bookmarklet-card";
import { PasswordForm, ProfileForm } from "@/components/settings-forms";
import { StorageCheck } from "@/components/storage-check";

export default async function SettingsPage() {
  const user = await requireUser();
  const { t } = await getTranslator();

  return (
    <div className="mx-auto max-w-xl space-y-5 sm:space-y-6">
      <div>
        <Link href="/account" className="btn btn-ghost btn-sm -ml-3 mb-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t("settings.back")}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t("settings.title")}
        </h1>
      </div>

      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 font-semibold text-ink">{t("settings.profile")}</h2>
        <ProfileForm
          name={user.name}
          handle={user.handle}
          locale={user.locale}
          avatarUrl={user.avatarUrl}
          bio={user.bio}
        />
      </section>

      <BookmarkletCard />

      <StorageCheck />

      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 font-semibold text-ink">{t("settings.password")}</h2>
        <PasswordForm />
      </section>

      {/* Op een telefoon staat er geen uitlogknop in de balk bovenaan, dus die
          hoort hier thuis — anders kom je er niet meer uit. */}
      <section className="card p-5 sm:p-6">
        <h2 className="font-semibold text-ink">{t("nav.logout")}</h2>
        <p className="mt-1 text-sm text-muted">{t("settings.logoutBody")}</p>
        <form action={logoutAction} className="mt-4">
          <button type="submit" className="btn btn-secondary w-full sm:w-auto">
            {t("nav.logout")}
          </button>
        </form>
      </section>
    </div>
  );
}
