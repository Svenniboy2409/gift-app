import { requireUser } from "@/lib/auth";
import { getTranslator } from "@/lib/i18n/server";
import { BookmarkletCard } from "@/components/bookmarklet-card";
import { PasswordForm, ProfileForm } from "@/components/settings-forms";
import { StorageCheck } from "@/components/storage-check";

export default async function SettingsPage() {
  const user = await requireUser();
  const { t } = await getTranslator();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        {t("settings.title")}
      </h1>

      <section className="card p-6">
        <h2 className="mb-4 font-semibold text-ink">{t("settings.profile")}</h2>
        <ProfileForm
          name={user.name}
          handle={user.handle}
          locale={user.locale}
        />
      </section>

      <BookmarkletCard />

      <StorageCheck />

      <section className="card p-6">
        <h2 className="mb-4 font-semibold text-ink">{t("settings.password")}</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
