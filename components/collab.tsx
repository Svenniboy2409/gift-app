"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import {
  acceptListInviteAction,
  inviteToListAction,
  joinListAction,
  removeListInviteAction,
  removeMemberAction,
  setHiddenOnProfileAction,
} from "@/lib/actions/collab";
import type { FormState } from "@/lib/actions/auth";
import type { Participant } from "@/lib/collab";
import type { FriendProfile } from "@/lib/friends";
import { useI18n } from "@/lib/i18n/client";
import { useOrigin } from "@/lib/hooks";
import { Avatar } from "@/components/avatar";
import { ShareRow } from "@/components/share-row";

/**
 * Samen aan een lijst werken: wie doet er mee, wie kun je nog vragen, en de
 * link om iemand buiten je vriendenlijst uit te nodigen.
 */
export function ListCollab({
  listId,
  isOwner,
  viewerId,
  participants,
  invitable,
  pending,
  collabCode,
  max,
  onProfile,
  hiddenOnProfile,
}: {
  listId: string;
  isOwner: boolean;
  /** Wie er kijkt; nodig om jezelf uit de lijst te kunnen halen. */
  viewerId: string;
  participants: Participant[];
  /** Vrienden die nog niet meedoen en nog geen uitnodiging hebben. */
  invitable: FriendProfile[];
  /** Verstuurde uitnodigingen die nog open staan. */
  pending: { id: string; name: string }[];
  collabCode: string | null;
  max: number;
  /** Zet de eigenaar de lijst op ieders profiel? Dan valt er iets te kiezen. */
  onProfile: boolean;
  /** Staat hij van jouw profiel af? `null` als je niet meedoet. */
  hiddenOnProfile: boolean | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const origin = useOrigin();
  const [busy, start] = useTransition();

  const full = participants.length + pending.length >= max;
  const url = collabCode ? `${origin}/j/${collabCode}` : "";

  function run(action: (data: FormData) => Promise<unknown>, fields: Record<string, string>) {
    start(async () => {
      const data = new FormData();
      for (const [key, value] of Object.entries(fields)) data.set(key, value);
      await action(data);
      router.refresh();
    });
  }

  return (
    <section className="border-t border-line pt-5">
      <h3 className="font-semibold text-ink">{t("collab.title")}</h3>
      <p className="mt-1 text-sm text-muted">
        {t("collab.body", { max: String(max) })}
      </p>

      <ul className="mt-3 space-y-2">
        {participants.map((person) => (
          <li
            key={person.id}
            className="flex items-center gap-3 rounded-xl bg-sunken p-2.5"
          >
            <Avatar name={person.name} src={person.avatarUrl} className="size-9" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">
                {person.name}
              </span>
              <span className="block truncate text-xs text-muted">
                @{person.handle}
              </span>
            </span>
            {person.isOwner ? (
              <span className="chip">{t("collab.owner")}</span>
            ) : (
              isOwner && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() =>
                    run(removeMemberAction, { listId, userId: person.id })
                  }
                >
                  {t("social.remove")}
                </button>
              )
            )}
          </li>
        ))}

        {pending.map((invite) => (
          <li
            key={invite.id}
            className="flex items-center gap-3 rounded-xl bg-sunken p-2.5"
          >
            <Avatar name={invite.name} className="size-9" />
            {/* De status onder de naam, want naast de naam valt hij op een
                telefoon buiten beeld. */}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">
                {invite.name}
              </span>
              <span className="block truncate text-xs text-muted">
                {t("social.waiting")}
              </span>
            </span>
            {isOwner && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy}
                onClick={() =>
                  run(removeListInviteAction, { inviteId: invite.id })
                }
              >
                {t("social.cancel")}
              </button>
            )}
          </li>
        ))}
      </ul>

      {isOwner && (
        <>
          {full ? (
            <p className="mt-3 text-sm text-muted">
              {t("collab.full", { max: String(max) })}
            </p>
          ) : invitable.length > 0 ? (
            <div className="mt-4">
              <span className="label">{t("collab.inviteFriends")}</span>
              <div className="flex flex-wrap gap-1.5">
                {invitable.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    className="chip px-3 py-1.5 text-sm text-muted"
                    disabled={busy}
                    onClick={() =>
                      run(
                        (data) => inviteToListAction({}, data),
                        { listId, userId: friend.id },
                      )
                    }
                  >
                    + {friend.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">{t("collab.noFriends")}</p>
          )}

          {collabCode && !full && (
            <div className="mt-4">
              <span className="label">{t("collab.link")}</span>
              <ShareRow
                url={url}
                title={t("collab.title")}
                shareLabel={t("collab.linkShare")}
                linkLabel={t("collab.link")}
                className=""
              />
            </div>
          )}
        </>
      )}

      {/* De eigenaar bepaalt of de lijst op ieders profiel staat. Wil je hem
          niet op die van jou, dan haal je hem er hier vanaf — bij de anderen
          blijft hij gewoon staan. */}
      {!isOwner && hiddenOnProfile !== null && onProfile && (
        <div className="mt-4 rounded-xl bg-sunken p-3">
          <p className="text-sm font-semibold text-ink">
            {t("collab.profileTitle")}
          </p>
          <p className="mt-1 text-sm text-muted">
            {t(hiddenOnProfile ? "collab.profileHidden" : "collab.profileShown")}
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm mt-3 w-full sm:w-auto"
            disabled={busy}
            onClick={() =>
              run(setHiddenOnProfileAction, {
                listId,
                hidden: hiddenOnProfile ? "0" : "1",
              })
            }
          >
            {t(hiddenOnProfile ? "collab.profileShow" : "collab.profileHide")}
          </button>
        </div>
      )}

      {!isOwner && (
        <button
          type="button"
          className="btn btn-danger mt-4 w-full sm:w-auto"
          disabled={busy}
          onClick={() => {
            if (!window.confirm(t("collab.leaveConfirm"))) return;
            run(removeMemberAction, { listId, userId: viewerId });
          }}
        >
          {t("collab.leave")}
        </button>
      )}
    </section>
  );
}

/** De uitnodigingen om aan iemands lijst mee te werken, op het tabblad Sociaal. */
export function ListInvites({
  invites,
}: {
  invites: {
    id: string;
    list: {
      id: string;
      title: string;
      coverColor: string;
      user: { name: string; handle: string; avatarUrl: string | null };
    };
  }[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, start] = useTransition();

  if (invites.length === 0) return null;

  function run(action: (data: FormData) => Promise<void>, inviteId: string) {
    start(async () => {
      const data = new FormData();
      data.set("inviteId", inviteId);
      await action(data);
      router.refresh();
    });
  }

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-ink">
        {t("collab.invitesTitle")}
      </h2>
      <ul className="mt-3 space-y-2">
        {invites.map((invite) => (
          <li
            key={invite.id}
            className="card flex flex-wrap items-center gap-3 p-3"
          >
            <span
              className={`cover-${invite.list.coverColor} size-12 shrink-0 rounded-xl`}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-ink">
                {invite.list.title}
              </span>
              <span className="block truncate text-sm text-muted">
                {t("collab.invitedBy", { name: invite.list.user.name })}
              </span>
            </span>
            {/* Op een telefoon eronder, anders knijpen ze de naam van de lijst weg. */}
            <span className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busy}
                onClick={() => run(acceptListInviteAction, invite.id)}
              >
                {t("social.accept")}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy}
                onClick={() => run(removeListInviteAction, invite.id)}
              >
                {t("social.decline")}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** De knop op de meedoen-pagina; de actie stuurt je daarna naar de lijst. */
export function JoinListButton({ listId }: { listId: string }) {
  const { t } = useI18n();
  const [state, formAction] = useActionState<FormState, FormData>(
    joinListAction,
    {},
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="listId" value={listId} />
      <button type="submit" className="btn btn-primary">
        {t("collab.join")}
      </button>
      {state.error === "list-full" && (
        <p className="mt-2 text-sm text-danger">{t("error.list-full")}</p>
      )}
    </form>
  );
}
