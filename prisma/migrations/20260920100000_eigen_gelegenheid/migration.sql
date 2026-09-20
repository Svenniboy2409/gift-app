-- Bij de gelegenheid "Anders" mag je zelf zeggen waar de lijst voor is:
-- "Jubileum", "Nieuwe baan", "Housewarming van Tim". Laat je het leeg, dan
-- blijft er gewoon "Anders" staan — vandaar dat de kolom mag ontbreken.
ALTER TABLE "List" ADD COLUMN     "occasionNote" TEXT;
