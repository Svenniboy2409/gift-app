/**
 * Draait de databasemigraties tijdens het bouwen — maar alleen als er een
 * database is.
 *
 * Op Vercel bestaat je project pas ná de eerste deploy, dus je kunt er
 * onmogelijk vóór die tijd een database aan koppelen. Zou de build hier
 * stukloopen, dan mislukt die eerste deploy dus altijd en heb je niets om te
 * openen. In plaats daarvan slaan we de migraties over; de app toont dan zelf
 * een pagina die uitlegt wat er nog moet gebeuren.
 *
 * Is DATABASE_URL er wél, dan telt een mislukte migratie gewoon als een
 * mislukte build — dat is een echt probleem dat je wil zien.
 */
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log(
    "[migrate] Geen DATABASE_URL gevonden — migraties overgeslagen.\n" +
      "[migrate] Koppel een database en deploy opnieuw; dan worden de tabellen aangemaakt.",
  );
  process.exit(0);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
