import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getListsForOwner } from "@/lib/lists";
import { getTranslator } from "@/lib/i18n/server";
import { ListCard } from "@/components/list-card";

export default async function DashboardPage() {
  const user = await requireUser();
  const [lists, { t, locale }] = await Promise.all([
    getListsForOwner(user.id),
    getTranslator(),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {t("dashboard.title")}
          </h1>
          <p className="mt-1 text-sm text-muted sm:mt-1.5 sm:text-base">
            {t("dashboard.subtitle")}
          </p>
        </div>
        {/* Op de telefoon zit deze knop al in de balk onderaan. */}
        <Link href="/lists/new" className="btn btn-primary hidden md:inline-flex">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="size-4"
          >
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
          {t("dashboard.newList")}
        </Link>
      </div>

      {lists.length === 0 ? (
        <div className="card mt-6 flex flex-col items-center px-6 py-12 text-center sm:mt-8 sm:py-16">
          <div className="cover-terracotta flex size-14 items-center justify-center rounded-2xl">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.8"
              className="size-7"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7Zm0 0h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7Z"
              />
            </svg>
          </div>
          <h2 className="mt-5 text-lg font-semibold text-ink">
            {t("dashboard.empty.title")}
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted">
            {t("dashboard.empty.body")}
          </p>
          <Link href="/lists/new" className="btn btn-primary mt-6">
            {t("dashboard.newList")}
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {lists.map((list) => (
            <ListCard
              key={list.id}
              href={`/lists/${list.id}`}
              t={t}
              locale={locale}
              list={{
                title: list.title,
                description: list.description,
                occasion: list.occasion,
                eventDate: list.eventDate,
                coverColor: list.coverColor,
                shareCode: list.shareCode,
                visibility: list.visibility,
                giftCount: list._count.gifts,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
