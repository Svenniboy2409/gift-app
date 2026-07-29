import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicProfile } from "@/lib/lists";
import { getTranslator } from "@/lib/i18n/server";
import { PlainHeader, SiteFooter } from "@/components/site-header";
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
      <PlainHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-14">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-4xl">
          {t("profile.title", { name: profile.name })}
        </h1>

        {profile.lists.length === 0 ? (
          <p className="mt-4 text-muted">
            {t("profile.empty", { name: profile.name })}
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
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
