import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

type Client = InstanceType<typeof PrismaClient>;

function createClient(): Client {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is niet ingesteld");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const globalForPrisma = globalThis as unknown as { prisma?: Client };

let client: Client | undefined;

/**
 * De client wordt pas bij het eerste gebruik gemaakt, niet bij het inladen van
 * deze module. Dat is nodig omdat Next.js tijdens het bouwen alle modules
 * evalueert: zonder DATABASE_URL zou de build anders stuklopen, terwijl je die
 * variabele op Vercel pas ná de eerste deploy kunt zetten.
 *
 * Eenmaal gemaakt hergebruiken we hem — één verbindingspool per proces. Dat is
 * geen detail: de proxy hieronder roept dit aan bij élke eigenschapstoegang,
 * dus zonder deze cache opent iedere query een nieuwe pool die nooit meer
 * dichtgaat, en loopt de database binnen de kortste keren vol.
 *
 * In development hangt hij aan globalThis, zodat hot reload niet bij elke
 * wijziging opnieuw begint.
 */
function getClient(): Client {
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma ??= createClient();
    return globalForPrisma.prisma;
  }
  client ??= createClient();
  return client;
}

export const prisma = new Proxy({} as Client, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
});
