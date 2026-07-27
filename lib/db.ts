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

/**
 * De client wordt pas bij het eerste gebruik gemaakt, niet bij het inladen van
 * deze module. Dat is nodig omdat Next.js tijdens het bouwen alle modules
 * evalueert: zonder DATABASE_URL zou de build anders stuklopen, terwijl je die
 * variabele op Vercel pas ná de eerste deploy kunt zetten.
 *
 * In development bewaren we de client op globalThis, zodat hot reload niet bij
 * elke wijziging een nieuwe verbindingspool opent.
 */
function getClient(): Client {
  if (!globalForPrisma.prisma) {
    const client = createClient();
    if (process.env.NODE_ENV === "production") return client;
    globalForPrisma.prisma = client;
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as Client, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
});
