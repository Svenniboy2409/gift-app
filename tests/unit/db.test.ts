import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

describe("database", () => {
  it("kan een gebruiker aanmaken, lezen en verwijderen", async () => {
    const user = await prisma.user.create({
      data: {
        email: `smoke-${Date.now()}@example.com`,
        passwordHash: "x",
        name: "Smoke",
        handle: `smoke-${Date.now()}`,
      },
    });
    expect(user.locale).toBe("nl");

    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found?.name).toBe("Smoke");

    await prisma.user.delete({ where: { id: user.id } });
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
  });
});
