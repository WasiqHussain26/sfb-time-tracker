/*
  Warnings:

  - You are about to drop the column `idleTime` on the `TimeSession` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TimeSession" DROP COLUMN "idleTime",
ADD COLUMN     "duration" INTEGER DEFAULT 0,
ADD COLUMN     "idleDuration" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ALTER COLUMN "startTime" SET DEFAULT CURRENT_TIMESTAMP;
