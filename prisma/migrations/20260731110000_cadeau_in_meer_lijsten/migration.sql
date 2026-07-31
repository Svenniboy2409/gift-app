-- Hetzelfde cadeau kan in meerdere lijsten staan, elk als eigen rij. Die rijen
-- horen bij elkaar via groupId. Wat er al stond is elk voor zich, dus krijgt
-- iedere rij zijn eigen code.
ALTER TABLE "Gift" ADD COLUMN "groupId" TEXT;
UPDATE "Gift" SET "groupId" = "id";
ALTER TABLE "Gift" ALTER COLUMN "groupId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Gift_groupId_idx" ON "Gift"("groupId");
