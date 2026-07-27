import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicProfile } from "@/lib/lists";
import { getTranslator } from "@/lib/i18n/server";
import { SiteFooter } from "@/components/site-header";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme";
import { Logo } from "@/components/logo";
import { ListCard } from "@/components/list-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getPublicProfile(handle);
  return {
    title: profile ? `${profile.name} — Wenslijst` : "Wenslijst",
    robots: { index: false, follow: false },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const [profile, { t, locale }] = await Promise.all([
    getPublicProfile(handle.toLowerCase()),
    getTranslator(),
  ]);
  if (!profile) notFound();

  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
          <span className="flex items-center gap-2 font-semibold tracking-tight text-ink">
            <Logo />
            {t("app.name")}
          </span>
          <div className="flex-1" />
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {t("profile.title", { name: profile.name })}
        </h1>

        {profile.lists.length === 0 ? (
          <p className="mt-4 text-muted">
            {t("profile.empty", { name: profile.name })}
          </p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {profile.lists.map((list) => (
              <ListCard
                key={list.shareCode}
                href={`/l/${list.shareCode}`}
                t={t}
                locale={locale}
                list={{
                  title: list.title,
                  description: list.description,
                  occasion: list.occasion,
                  eventDate: list.eventDate,
                  coverColor: list.coverColor,
                  shareCode: list.shareCode,
                  giftCount: list._count.gifts,
                }}
              />
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
