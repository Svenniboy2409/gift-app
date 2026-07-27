-- CreateEnum
CREATE TYPE "Occasion" AS ENUM ('BIRTHDAY', 'CHRISTMAS', 'SINTERKLAAS', 'WEDDING', 'BABY', 'HOUSEWARMING', 'GRADUATION', 'OTHER');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'LINK', 'PUBLIC');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'nl',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "List" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "occasion" "Occasion" NOT NULL DEFAULT 'OTHER',
    "eventDate" TIMESTAMP(3),
    "coverColor" TEXT NOT NULL DEFAULT 'terracotta',
    "coverImageUrl" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'LINK',
    "shareCode" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "List_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gift" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "note" TEXT,
    "priceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "url" TEXT,
    "merchant" TEXT,
    "imageUrl" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "giftId" TEXT NOT NULL,
    "claimerName" TEXT NOT NULL,
    "claimerToken" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "List_shareCode_key" ON "List"("shareCode");

-- CreateIndex
CREATE INDEX "List_userId_idx" ON "List"("userId");

-- CreateIndex
CREATE INDEX "Gift_listId_idx" ON "Gift"("listId");

-- CreateIndex
CREATE INDEX "Claim_giftId_idx" ON "Claim"("giftId");

-- CreateIndex
CREATE INDEX "Claim_claimerToken_idx" ON "Claim"("claimerToken");

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "Gift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
