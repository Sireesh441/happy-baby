-- AlterTable
ALTER TABLE "product_groups" ADD COLUMN     "bulk_pricing" JSONB;

-- AlterTable: cart_items -- product_id becomes nullable (bulk-pack lines
-- have no single product), plus new bulk-pack columns.
ALTER TABLE "cart_items" ALTER COLUMN "product_id" DROP NOT NULL;
ALTER TABLE "cart_items" ADD COLUMN     "product_group_id" INTEGER,
ADD COLUMN     "pack_size" INTEGER,
ADD COLUMN     "bulk_breakdown" JSONB,
ADD COLUMN     "bulk_price_per_unit" INTEGER;

-- CreateIndex
CREATE INDEX "cart_items_product_group_id_idx" ON "cart_items"("product_group_id");

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_group_id_fkey" FOREIGN KEY ("product_group_id") REFERENCES "product_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
