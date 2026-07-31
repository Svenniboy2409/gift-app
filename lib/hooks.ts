"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * De origin van de browser (bijv. "https://wenslijst.app"). Tijdens
 * server-rendering is die er nog niet, dus die geeft een lege string terug;
 * React rendert daarna opnieuw met de echte waarde.
 */
export function useOrigin() {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
}

/**
 * Kent deze browser het deelvenster van het toestel? Een telefoon wel, de
 * meeste browsers op een computer niet. Tijdens server-rendering gaan we uit
 * van niet, zodat er geen knop verschijnt die daarna niets doet.
 */
export function useCanShare() {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );
}
