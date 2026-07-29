import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getListsForOwner } from "@/lib/lists";
import { getTranslator } from "@/lib/i18n/server";
import { Avatar } from "@/components/avatar";
import { HiddenLists } from "@/components/hidden-lists";
import { ListCard } from "@/components/list-card";
import { ProfileLink } from "@/components/profile-link";

/**
 * Je eigen profiel, zoals anderen het zien — met daaronder, weggeklapt, de
 * lijsten die je juist níét deelt. De instellingen zitten achter het tandwiel
 * linksboven.
 */
export default async function AccountPage() {
  const user = await requireUser();
  const [lists, { t, locale }] = await Promise.all([
    getListsForOwner(user.id),
    getTranslator(),
  ]);

  const publicLists = lists.filter((list) => list.visibility === "PUBLIC");
  const hiddenLists = lists.filter((list) => list.visibility !== "PUBLIC");

  const toCard = (list: (typeof lists)[number]) => ({
    title: list.title,
    description: list.description,
    occasion: list.occasion,
    eventDate: list.eventDate,
    coverColor: list.coverColor,
    shareCode: list.shareCode,
    visibility: list.visibility,
    giftCount: list._count.gifts,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <Link
          href="/settings"
          className="btn btn-ghost -ml-2 px-2 text-ink"
          aria-label={t("nav.settings")}
          title={t("nav.settings")}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="size-6"
          >
            <circle cx="12" cy="12" r="3.2" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.1 4.7a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.01c.28.66.9 1.1 1.6 1.1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.03Z"
            />
          </svg>
        </Link>
      </div>

      {/* Zo ziet je profiel eruit voor iemand die je link opent. */}
      <section className="card flex flex-col items-center px-5 py-7 text-center sm:px-8">
        <Avatar name={user.name} src={user.avatarUrl} className="size-24" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">
          {user.name}
        </h1>
        <ProfileLink handle={user.handle} />
        {user.bio && (
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            {user.bio}
          </p>
        )}
        {!user.bio && !user.avatarUrl && (
          <Link href="/settings" className="btn btn-secondary btn-sm mt-4">
            {t("profile.complete")}
          </Link>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          {t("profile.publicLists")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("profile.publicListsBody")}</p>

        {publicLists.length === 0 ? (
          <div className="card mt-4 px-6 py-10 text-center">
            <p className="text-sm text-muted">{t("profile.noPublicLists")}</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {publicLists.map((list) => (
              <ListCard
                key={list.id}
                href={`/lists/${list.id}`}
                t={t}
                locale={locale}
                list={toCard(list)}
              />
            ))}
          </div>
        )}
      </section>

      {hiddenLists.length > 0 && (
        <HiddenLists count={hiddenLists.length}>
          <div className="grid gap-4 sm:grid-cols-2">
            {hiddenLists.map((list) => (
              <ListCard
                key={list.id}
                href={`/lists/${list.id}`}
                t={t}
                locale={locale}
                list={toCard(list)}
              />
            ))}
          </div>
        </HiddenLists>
      )}
    </div>
  );
}
