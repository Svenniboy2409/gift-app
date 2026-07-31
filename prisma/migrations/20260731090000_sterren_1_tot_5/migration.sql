-- "Hoe graag?" ging van drie stappen naar vijf sterren. Bestaande cadeaus
-- houden hun bedoeling: leuk blijft de laagste, heel graag wordt de hoogste.
UPDATE "Gift" SET "priority" = CASE "priority"
  WHEN 3 THEN 5
  WHEN 2 THEN 3
  ELSE 1
END;

-- AlterTable
ALTER TABLE "Gift" ALTER COLUMN "priority" SET DEFAULT 3;
