import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPublicProfile } from "@/lib/lists";
import { getTranslator } from "@/lib/i18n/server";
import { PlainHeader, SiteFooter } from "@/components/site-header";
import { relationTo } from "@/lib/friends";
import { Avatar } from "@/components/avatar";
import { FriendButton } from "@/components/people";
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
  const viewer = await getCurrentUser();
  const [profile, { t, locale }] = await Promise.all([
    getPublicProfile(handle.toLowerCase(), viewer?.id),
    getTranslator(),
  ]);
  if (!profile) notFound();

  // Kijk je bij iemand anders, dan hoort daar een knop bij om vrienden te
  // worden — of de stand van zaken als dat al loopt.
  const relation = viewer ? await relationTo(viewer.id, profile.id) : null;

  return (
    <>
      <PlainHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-14">
        <div className="flex flex-col items-center text-center">
          <Avatar
            name={profile.name}
            src={profile.avatarUrl}
            className="size-24"
          />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink sm:text-4xl">
            {t("profile.title", { name: profile.name })}
          </h1>
          <p className="mt-1 text-sm font-medium text-subtle">@{profile.handle}</p>
          {profile.bio && (
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted sm:text-base">
              {profile.bio}
            </p>
          )}
          {relation && relation !== "self" && (
            <div className="mt-4">
              <FriendButton userId={profile.id} relation={relation} />
            </div>
          )}
        </div>

        {profile.lists.length === 0 ? (
          <p className="mt-6 text-center text-muted">
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
                  // Zo zie je als vriend meteen waarom je deze lijst kunt zien.
                  visibility: list.visibility,
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
