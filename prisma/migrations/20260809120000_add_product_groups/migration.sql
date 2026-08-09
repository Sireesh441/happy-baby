-- CreateTable
CREATE TABLE "product_groups" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "vertical" "Vertical" NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_groups_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "product_group_id" INTEGER,
ADD COLUMN     "variant_color" TEXT;

-- CreateIndex
CREATE INDEX "products_product_group_id_idx" ON "products"("product_group_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_product_group_id_fkey" FOREIGN KEY ("product_group_id") REFERENCES "product_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
