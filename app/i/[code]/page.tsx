import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isConfigured } from "@/lib/config";
import { findByInviteCode, relationTo } from "@/lib/friends";
import { getTranslator } from "@/lib/i18n/server";
import { Avatar } from "@/components/avatar";
import { FriendButton } from "@/components/people";
import { PlainHeader, SiteFooter } from "@/components/site-header";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Waar een uitnodigingslink op uitkomt: het profiel van degene die hem deelde,
 * met één knop om vrienden te worden. Ben je nog niet ingelogd, dan sturen we
 * je eerst langs het inloggen en kom je hier weer terug.
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  if (!isConfigured()) redirect("/");

  const { code } = await params;
  const [person, { t }] = await Promise.all([
    findByInviteCode(code),
    getTranslator(),
  ]);
  if (!person) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/i/${code}`)}`);

  const relation = await relationTo(user.id, person.id);

  return (
    <>
      <PlainHeader href="/dashboard" />

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:px-6">
        <div className="card flex flex-col items-center px-5 py-8 text-center">
          <Avatar name={person.name} src={person.avatarUrl} className="size-24" />
          <h1 className="mt-4 text-xl font-bold tracking-tight text-ink">
            {t("social.inviteFrom", { name: person.name })}
          </h1>
          <p className="mt-1 text-sm font-medium text-subtle">@{person.handle}</p>
          {person.bio && (
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
              {person.bio}
            </p>
          )}

          <div className="mt-6">
            <FriendButton userId={person.id} relation={relation} />
          </div>

          <Link href="/friends" className="btn btn-ghost btn-sm mt-4">
            {t("social.title")}
          </Link>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
