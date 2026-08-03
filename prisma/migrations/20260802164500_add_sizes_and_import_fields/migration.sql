-- AlterTable
ALTER TABLE "products" ADD COLUMN     "sizes" JSONB,
ADD COLUMN     "in_stock" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "products_name_vertical_key" ON "products"("name", "vertical");
