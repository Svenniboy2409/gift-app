import "server-only";

/**
 * De variabelen die de app nodig heeft om te kunnen draaien. Vlak na een
 * eerste deploy staan die er nog niet, en dan willen we een uitleg tonen in
 * plaats van een stacktrace.
 */
export const REQUIRED_ENV = ["DATABASE_URL", "AUTH_SECRET"] as const;

export type RequiredEnv = (typeof REQUIRED_ENV)[number];

/**
 * Welke verplichte variabelen ontbreken. Geeft alleen de námen terug — nooit
 * waarden, want de setup-pagina is publiek zichtbaar.
 */
export function missingConfig(): RequiredEnv[] {
  return REQUIRED_ENV.filter((name) => !process.env[name]);
}

export function isConfigured() {
  return missingConfig().length === 0;
}
