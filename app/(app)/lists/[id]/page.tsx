import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getListForOwner } from "@/lib/gifts";
import { getTranslator } from "@/lib/i18n/server";
import { daysUntil, formatDate } from "@/lib/i18n";
import {
  MAX_MEMBERS,
  getCollabCode,
  getParticipants,
  isListOwner,
} from "@/lib/collab";
import { getFriends } from "@/lib/friends";
import { prisma } from "@/lib/db";
import { ListCollab } from "@/components/collab";
import { GiftManager } from "@/components/gift-manager";
import { ListSettings } from "@/components/list-settings";
import { SharePanel } from "@/components/share-panel";

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  // getListForOwner selecteert bewust géén claims: de eigenaar mag niet
  // kunnen zien wat er al gekocht is.
  const [list, { t, locale }] = await Promise.all([
    getListForOwner(user.id, id),
    getTranslator(),
  ]);
  if (!list) notFound();

  // Wie doet er mee, wie kun je nog vragen, en wat is de link om mee te doen?
  const owner = await isListOwner(user.id, list.id);
  const [participants, friends, invites, collabCode] = await Promise.all([
    getParticipants(list.id),
    owner ? getFriends(user.id) : Promise.resolve([]),
    owner
      ? prisma.listInvite.findMany({
          where: { listId: list.id },
          select: { id: true, to: { select: { id: true, name: true } } },
        })
      : Promise.resolve([]),
    owner ? getCollabCode(user.id, list.id) : Promise.resolve(null),
  ]);

  const invited = new Set(invites.map((invite) => invite.to.id));
  const inList = new Set(participants.map((person) => person.id));
  const invitable = friends.filter(
    (friend) => !inList.has(friend.id) && !invited.has(friend.id),
  );

  const days = list.eventDate ? daysUntil(list.eventDate) : null;
  const countdown =
    days === null
      ? null
      : days === 0
        ? t("visitor.countdown.today")
        : days === 1
          ? t("visitor.countdown.day")
          : days > 1
            ? t("visitor.countdown.days", { count: days })
            : t("visitor.countdown.past", {
                date: formatDate(list.eventDate!, locale),
              });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="btn btn-ghost btn-sm -ml-3 mb-3">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="size-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t("list.back")}
        </Link>

        <div
          className={`cover-${list.coverColor} relative overflow-hidden rounded-2xl p-5 sm:p-8`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

          {/* De instellingen horen bij de lijst, dus staan ze op de omslag. */}
          <ListSettings
            isOwner={owner}
            listId={list.id}
            initial={{
              title: list.title,
              description: list.description ?? "",
              occasion: list.occasion,
              eventDate: list.eventDate
                ? list.eventDate.toISOString().slice(0, 10)
                : "",
              coverColor: list.coverColor,
              visibility: list.visibility,
            }}
          >
            <ListCollab
              listId={list.id}
              isOwner={owner}
              viewerId={user.id}
              participants={participants}
              invitable={invitable}
              pending={invites.map((invite) => ({
                id: invite.id,
                name: invite.to.name,
              }))}
              collabCode={collabCode}
              max={MAX_MEMBERS}
            />
          </ListSettings>
          <div className="relative">
            <span className="rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold text-[#2a231d]">
              {t(`occasion.${list.occasion}` as "occasion.OTHER")}
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-4xl">
              {list.title}
            </h1>
            {list.description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
                {list.description}
              </p>
            )}
            {participants.length > 1 && (
              <p className="mt-2 text-sm text-white/90">
                {t("collab.together", {
                  names: participants.map((person) => person.name).join(", "),
                })}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {countdown && (
                <span className="rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold text-[#2a231d]">
                  {countdown}
                </span>
              )}
              <span className="rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold text-[#2a231d]">
                {t(`visibility.${list.visibility}` as "visibility.LINK")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <SharePanel
        listId={list.id}
        shareCode={list.shareCode}
        handle={user.handle}
        visibility={list.visibility}
      />

      <GiftManager listId={list.id} gifts={list.gifts} />
    </div>
  );
}
