import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { isConfigured } from "@/lib/config";
import { MAX_MEMBERS, canEditList, findByCollabCode } from "@/lib/collab";
import { getTranslator } from "@/lib/i18n/server";
import { Avatar } from "@/components/avatar";
import { JoinListButton } from "@/components/collab";
import { PlainHeader, SiteFooter } from "@/components/site-header";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Waar de link "samen aan deze lijst werken" op uitkomt. Eén knop om mee te
 * doen; daarna sta je gewoon in de lijst en mag je cadeaus toevoegen.
 */
export default async function JoinListPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  if (!isConfigured()) redirect("/");

  const { code } = await params;
  const [list, { t }] = await Promise.all([
    findByCollabCode(code),
    getTranslator(),
  ]);
  if (!list) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/j/${code}`)}`);

  // Doe je al mee, dan hoeft er niets gevraagd te worden.
  if (await canEditList(user.id, list.id)) redirect(`/lists/${list.id}`);

  const full = list._count.members + 1 >= MAX_MEMBERS;

  return (
    <>
      <PlainHeader href="/dashboard" />

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:px-6">
        <div className="card flex flex-col items-center px-5 py-8 text-center">
          <span className={`cover-${list.coverColor} size-16 rounded-2xl`} />
          <h1 className="mt-4 text-xl font-bold tracking-tight text-ink">
            {t("collab.joinTitle")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t("collab.joinBody", { name: list.user.name, title: list.title })}
          </p>

          <div className="mt-4 flex items-center gap-2">
            <Avatar
              name={list.user.name}
              src={list.user.avatarUrl}
              className="size-8"
            />
            <span className="text-sm text-subtle">@{list.user.handle}</span>
          </div>

          <div className="mt-6">
            {full ? (
              <p className="text-sm text-danger">
                {t("collab.full", { max: String(MAX_MEMBERS) })}
              </p>
            ) : (
              <JoinListButton listId={list.id} />
            )}
          </div>

          <Link href="/dashboard" className="btn btn-ghost btn-sm mt-4">
            {t("nav.dashboard")}
          </Link>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
