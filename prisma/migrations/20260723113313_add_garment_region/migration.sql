-- CreateEnum
CREATE TYPE "GarmentRegion" AS ENUM ('upper_body', 'lower_body', 'dresses');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "garment_region" "GarmentRegion";
