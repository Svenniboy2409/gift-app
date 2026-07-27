/**
 * Draait de databasemigraties tijdens het bouwen — maar alleen als er een
 * database is, en bij voorkeur over een directe verbinding.
 *
 * Twee dingen gaan hier mis als je ze niet regelt:
 *
 * 1. Op Vercel bestaat je project pas ná de eerste deploy, dus je kunt er
 *    onmogelijk vóór die tijd een database aan koppelen. Zou de build hier
 *    stuklopen, dan mislukt die eerste deploy dus altijd en heb je niets om te
 *    openen. We slaan de migraties dan over; de app toont zelf een pagina die
 *    uitlegt wat er nog moet gebeuren.
 *
 * 2. Hosters als Neon geven je een DATABASE_URL die via een connectiepooler
 *    loopt. Prima voor de app zelf — serverless functies openen veel korte
 *    verbindingen — maar `prisma migrate deploy` gebruikt advisory locks en een
 *    langlopende sessie, en dat werkt niet betrouwbaar door zo'n pooler heen.
 *    Is er een directe verbinding beschikbaar, dan gebruiken we die hier. De
 *    app zelf blijft gewoon de pooler gebruiken.
 */
import { spawnSync } from "node:child_process";

// Lokaal staan de variabelen in .env; op een hoster zijn het echte
// omgevingsvariabelen en is dit een no-op. Ontbreekt dotenv, dan werken we
// gewoon met wat er in de omgeving staat.
try {
  await import("dotenv/config");
} catch {
  // niets aan de hand
}

if (!process.env.DATABASE_URL) {
  console.log(
    "[migrate] Geen DATABASE_URL gevonden — migraties overgeslagen.\n" +
      "[migrate] Koppel een database en deploy opnieuw; dan worden de tabellen aangemaakt.",
  );
  process.exit(0);
}

/**
 * Elke hoster noemt de directe verbinding anders. Eerste treffer wint.
 * DATABASE_URL zelf staat er als vangnet in: lokaal en bij zelf hosten zit er
 * meestal helemaal geen pooler tussen.
 */
const DIRECT_SOURCES = [
  "DIRECT_URL", // conventie uit de Prisma-documentatie
  "DATABASE_URL_UNPOOLED", // Neon-integratie op Vercel
  "POSTGRES_URL_NON_POOLING", // oudere Vercel Postgres-integratie
  "DATABASE_URL",
];

const source = DIRECT_SOURCES.find((name) => process.env[name]);

// Alleen de naam loggen, nooit de waarde: dit komt in de bouwlog terecht.
console.log(`[migrate] Migreren via ${source}.`);

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, DATABASE_URL: process.env[source] },
});

process.exit(result.status ?? 1);
