-- CreateTable
CREATE TABLE "product_conversions" (
    "id" UUID NOT NULL,
    "source_product_id" UUID NOT NULL,
    "destination_product_id" UUID NOT NULL,
    "conversion_factor" DECIMAL(14,3) NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_conversions_source_product_id_key" ON "product_conversions"("source_product_id");

-- CreateIndex
CREATE INDEX "product_conversions_destination_product_id_idx" ON "product_conversions"("destination_product_id");

-- CreateIndex
CREATE INDEX "product_conversions_active_idx" ON "product_conversions"("active");

-- AddForeignKey
ALTER TABLE "product_conversions" ADD CONSTRAINT "product_conversions_source_product_id_fkey" FOREIGN KEY ("source_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_conversions" ADD CONSTRAINT "product_conversions_destination_product_id_fkey" FOREIGN KEY ("destination_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Impedir fatores de conversao invalidos

ALTER TABLE "product_conversions"
ADD CONSTRAINT "product_conversions_positive_factor"
CHECK ("conversion_factor" > 0);

-- Impedir que um produto seja vinculado a ele mesmo

ALTER TABLE "product_conversions"
ADD CONSTRAINT "product_conversions_different_products"
CHECK ("source_product_id" <> "destination_product_id");