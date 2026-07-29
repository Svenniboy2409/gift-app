"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FormState } from "@/lib/actions/auth";
import {
  acceptRequestAction,
  removeFriendAction,
  removeRequestAction,
  sendRequestAction,
} from "@/lib/actions/friends";
import { useI18n } from "@/lib/i18n/client";
import { useOrigin } from "@/lib/hooks";
import type { FriendProfile, Relation } from "@/lib/friends";
import { Avatar } from "@/components/avatar";

/** Naam, profielnaam en foto — met rechts ruimte voor knoppen. */
function PersonRow({
  person,
  children,
  link = true,
}: {
  person: FriendProfile;
  children?: React.ReactNode;
  link?: boolean;
}) {
  const inner = (
    <>
      <Avatar name={person.name} src={person.avatarUrl} className="size-12" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink">
          {person.name}
        </span>
        <span className="block truncate text-sm text-muted">
          @{person.handle}
        </span>
      </span>
    </>
  );

  return (
    <li className="card flex items-center gap-3 p-3">
      {link ? (
        <Link
          href={`/u/${person.handle}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          {inner}
        </Link>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-3">{inner}</span>
      )}
      {children}
    </li>
  );
}

/** Eén knop die een serveractie uitvoert en daarna de pagina ververst. */
function ActionButton({
  action,
  fields,
  label,
  className = "btn btn-secondary btn-sm",
}: {
  action: (data: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const data = new FormData();
          for (const [key, value] of Object.entries(fields)) data.set(key, value);
          await action(data);
          router.refresh();
        })
      }
    >
      {label}
    </button>
  );
}

export function FriendList({ friends }: { friends: FriendProfile[] }) {
  const { t } = useI18n();

  if (friends.length === 0) {
    return (
      <div className="card px-6 py-10 text-center">
        <p className="text-sm text-muted">{t("social.noFriends")}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {friends.map((friend) => (
        <PersonRow key={friend.id} person={friend}>
          <ActionButton
            action={removeFriendAction}
            fields={{ userId: friend.id }}
            label={t("social.remove")}
            className="btn btn-ghost btn-sm"
          />
        </PersonRow>
      ))}
    </ul>
  );
}

export function IncomingRequests({
  requests,
}: {
  requests: { id: string; from: FriendProfile }[];
}) {
  const { t } = useI18n();
  if (requests.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-ink">
        {t("social.incoming")}
      </h2>
      <ul className="mt-3 space-y-2">
        {requests.map((request) => (
          <PersonRow key={request.id} person={request.from}>
            <ActionButton
              action={acceptRequestAction}
              fields={{ requestId: request.id }}
              label={t("social.accept")}
              className="btn btn-primary btn-sm"
            />
            <ActionButton
              action={removeRequestAction}
              fields={{ requestId: request.id }}
              label={t("social.decline")}
              className="btn btn-ghost btn-sm"
            />
          </PersonRow>
        ))}
      </ul>
    </section>
  );
}

export function OutgoingRequests({
  requests,
}: {
  requests: { id: string; to: FriendProfile }[];
}) {
  const { t } = useI18n();
  if (requests.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-ink">
        {t("social.outgoing")}
      </h2>
      <ul className="mt-3 space-y-2">
        {requests.map((request) => (
          <PersonRow key={request.id} person={request.to}>
            <span className="chip hidden sm:inline-flex">
              {t("social.waiting")}
            </span>
            <ActionButton
              action={removeRequestAction}
              fields={{ requestId: request.id }}
              label={t("social.cancel")}
              className="btn btn-ghost btn-sm"
            />
          </PersonRow>
        ))}
      </ul>
    </section>
  );
}

export type FoundPerson = FriendProfile & { relation: Relation };

/** Iemand opzoeken op naam of profielnaam en een uitnodiging sturen. */
export function PeopleSearch() {
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoundPerson[] | null>(null);
  const [pending, start] = useTransition();

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (term.length < 2) return;

    const response = await fetch(`/api/people?q=${encodeURIComponent(term)}`);
    if (!response.ok) {
      setResults([]);
      return;
    }
    setResults(((await response.json()) as { people: FoundPerson[] }).people);
  }

  function invite(person: FoundPerson) {
    start(async () => {
      const data = new FormData();
      data.set("userId", person.id);
      await sendRequestAction({}, data);
      setResults(
        (current) =>
          current?.map((entry) =>
            entry.id === person.id ? { ...entry, relation: "sent" } : entry,
          ) ?? null,
      );
      router.refresh();
    });
  }

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-ink">
        {t("social.find")}
      </h2>
      <p className="mt-1 text-sm text-muted">{t("social.findBody")}</p>

      <form onSubmit={search} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="field"
          placeholder={t("social.findPlaceholder")}
          aria-label={t("social.find")}
        />
        <button
          type="submit"
          className="btn btn-secondary shrink-0"
          disabled={query.trim().length < 2}
        >
          {t("social.search")}
        </button>
      </form>

      {results && results.length === 0 && (
        <p className="mt-3 text-sm text-muted">{t("social.noResults")}</p>
      )}

      {results && results.length > 0 && (
        <ul className="mt-3 space-y-2">
          {results.map((person) => (
            <PersonRow key={person.id} person={person}>
              {person.relation === "friends" ? (
                <span className="chip">{t("social.alreadyFriends")}</span>
              ) : person.relation === "sent" ? (
                <span className="chip">{t("social.waiting")}</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={pending}
                  onClick={() => invite(person)}
                >
                  {person.relation === "received"
                    ? t("social.accept")
                    : t("social.invite")}
                </button>
              )}
            </PersonRow>
          ))}
        </ul>
      )}
    </section>
  );
}

/** De uitnodigingslink om zelf te delen. */
export function InviteLink({ code }: { code: string }) {
  const { t } = useI18n();
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);
  const url = `${origin}/i/${code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Klembord geweigerd — de link staat er nog gewoon om te selecteren.
    }
  }

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: t("social.inviteTitle"), url });
        return;
      } catch {
        // Geannuleerd; kopiëren blijft over.
      }
    }
    await copy();
  }

  return (
    <section className="card p-5">
      <h2 className="font-semibold text-ink">{t("social.inviteTitle")}</h2>
      <p className="mt-1 text-sm text-muted">{t("social.inviteBody")}</p>

      <button type="button" className="btn btn-primary mt-3 w-full sm:hidden" onClick={share}>
        {t("social.inviteShare")}
      </button>

      <div className="mt-2 flex flex-col gap-2 sm:mt-3 sm:flex-row">
        <input
          readOnly
          value={url}
          onFocus={(event) => event.target.select()}
          className="field font-mono text-xs sm:text-sm"
          aria-label={t("social.inviteTitle")}
        />
        <button type="button" className="btn btn-secondary shrink-0" onClick={copy}>
          {copied ? t("share.copied") : t("share.copy")}
        </button>
      </div>
    </section>
  );
}

/** De knop op iemands profiel: uitnodigen, accepteren of al vrienden. */
export function FriendButton({
  userId,
  relation,
}: {
  userId: string;
  relation: Relation;
}) {
  const { t } = useI18n();
  const [state, formAction] = useActionState<FormState, FormData>(
    sendRequestAction,
    {},
  );

  if (relation === "self") return null;
  if (relation === "friends") {
    return <span className="chip">{t("social.alreadyFriends")}</span>;
  }
  if (relation === "sent" || state.success) {
    return <span className="chip">{t("social.waiting")}</span>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" className="btn btn-primary btn-sm">
        {relation === "received" ? t("social.accept") : t("social.invite")}
      </button>
    </form>
  );
}
