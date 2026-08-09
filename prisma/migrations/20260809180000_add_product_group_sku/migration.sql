-- AlterTable
ALTER TABLE "product_groups" ADD COLUMN     "sku" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "product_groups_sku_key" ON "product_groups"("sku");
