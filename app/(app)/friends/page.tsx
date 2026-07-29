import { requireUser } from "@/lib/auth";
import { getListInvitesFor } from "@/lib/collab";
import {
  getFriends,
  getIncomingRequests,
  getInviteCode,
  getOutgoingRequests,
} from "@/lib/friends";
import { getTranslator } from "@/lib/i18n/server";
import { ListInvites } from "@/components/collab";
import {
  FriendList,
  IncomingRequests,
  InviteLink,
  OutgoingRequests,
  PeopleSearch,
} from "@/components/people";

/**
 * Het tabblad Sociaal: je vrienden, de uitnodigingen die nog open staan, en
 * twee manieren om er iemand bij te krijgen — opzoeken of een link delen.
 */
export default async function FriendsPage() {
  const user = await requireUser();
  const [friends, incoming, outgoing, listInvites, code, { t }] =
    await Promise.all([
      getFriends(user.id),
      getIncomingRequests(user.id),
      getOutgoingRequests(user.id),
      getListInvitesFor(user.id),
      getInviteCode(user.id),
      getTranslator(),
    ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t("social.title")}
        </h1>
        <p className="mt-1 text-sm text-muted sm:text-base">
          {t("social.subtitle")}
        </p>
      </div>

      <IncomingRequests requests={incoming} />

      <ListInvites invites={listInvites} />

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          {t("social.friends", { count: friends.length })}
        </h2>
        <div className="mt-3">
          <FriendList friends={friends} />
        </div>
      </section>

      <OutgoingRequests requests={outgoing} />

      <PeopleSearch />

      <InviteLink code={code} />
    </div>
  );
}
