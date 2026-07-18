-- CreateEnum
CREATE TYPE "Vertical" AS ENUM ('kids', 'men', 'women');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "vertical" "Vertical" NOT NULL DEFAULT 'kids';
