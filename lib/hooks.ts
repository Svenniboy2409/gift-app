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
