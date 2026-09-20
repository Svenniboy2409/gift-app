"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { sendRequestAction } from "@/lib/actions/friends";
import { useI18n } from "@/lib/i18n/client";
import type { Relation } from "@/lib/friends";

/**
 * Het vriendschapsknopje op het profiel van iemand anders.
 *
 * Vier situaties, en het icoontje vertelt in welke je zit:
 *
 *   nog niets       een poppetje met een plusje — tikken stuurt een verzoek
 *   verzoek gedaan  een poppetje met een klokje — je wacht op antwoord
 *   zij vroegen jou een poppetje met een plusje — tikken accepteert
 *   al vrienden     een poppetje met een vinkje, en er valt niets te tikken
 *
 * Ben je niet ingelogd, dan kun je niemand toevoegen. Dat zeggen we pas als je
 * erop tikt: een knop die er wel staat maar niets doet is vervelender dan een
 * knop die uitlegt wat eraan ontbreekt.
 */

function Poppetje({ detail }: { detail: "plus" | "vink" | "klok" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-5"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3.4" />
      <path strokeLinecap="round" d="M2.6 19.4a6.4 6.4 0 0 1 12.8 0" />
      {detail === "plus" && (
        <path strokeLinecap="round" d="M19 8.5v5M16.5 11h5" />
      )}
      {detail === "vink" && (
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.6 11 1.9 2 3.1-3.6" />
      )}
      {detail === "klok" && (
        <>
          <circle cx="19" cy="11" r="3.4" />
          <path strokeLinecap="round" d="M19 9.4V11l1.2.9" />
        </>
      )}
    </svg>
  );
}

export function FriendIcon({
  userId,
  name,
  handle,
  /** `null` als je niet bent ingelogd. */
  relation,
}: {
  userId: string;
  name: string;
  handle: string;
  relation: Relation | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [bezig, start] = useTransition();

  if (relation === "self") return null;

  const alVrienden = relation === "friends";
  const gevraagd = relation === "sent";
  const detail = alVrienden ? "vink" : gevraagd ? "klok" : "plus";
  const label = alVrienden
    ? t("social.alreadyFriends")
    : gevraagd
      ? t("social.waiting")
      : relation === "received"
        ? t("social.accept")
        : t("friend.add", { name });

  function klik() {
    // Niet ingelogd: eerst uitleggen waarom dit niet kan, en dan de keuze.
    if (relation === null) {
      if (window.confirm(t("friend.needLogin"))) {
        router.push(`/login?next=${encodeURIComponent(`/u/${handle}`)}`);
      }
      return;
    }

    if (!window.confirm(t("friend.confirm", { name }))) return;
    start(async () => {
      const data = new FormData();
      data.set("userId", userId);
      await sendRequestAction({}, data);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={klik}
      // Al vrienden of al gevraagd: dan is dit een mededeling, geen knop.
      disabled={alVrienden || gevraagd || bezig}
      aria-label={label}
      title={label}
      className={`flex size-11 items-center justify-center rounded-full border transition-colors ${
        alVrienden
          ? "border-accent bg-accent-soft text-accent"
          : "border-line text-muted hover:border-accent hover:text-accent disabled:hover:border-line disabled:hover:text-muted"
      }`}
    >
      <Poppetje detail={detail} />
    </button>
  );
}
