/*
  Warnings:

  - The `location_permission` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "LocationPermission" AS ENUM ('GRANTED', 'DENIED');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "location_permission",
ADD COLUMN     "location_permission" "LocationPermission";
