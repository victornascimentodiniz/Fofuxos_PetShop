-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('ENTRY', 'EXIT', 'ADJUSTMENT', 'FRACTION_OUT', 'FRACTION_IN', 'SALE', 'PURCHASE');

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "previous_stock" DECIMAL(14,3) NOT NULL,
    "new_stock" DECIMAL(14,3) NOT NULL,
    "unit_cost" DECIMAL(14,4),
    "operation_id" UUID,
    "reason" VARCHAR(150) NOT NULL,
    "observations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_fractionations" (
    "id" UUID NOT NULL,
    "source_product_id" UUID NOT NULL,
    "destination_product_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "packages" INTEGER NOT NULL,
    "conversion_factor" DECIMAL(14,3) NOT NULL,
    "gross_quantity" DECIMAL(14,3) NOT NULL,
    "loss_quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "net_quantity" DECIMAL(14,3) NOT NULL,
    "source_unit_cost" DECIMAL(14,4) NOT NULL,
    "total_cost" DECIMAL(16,4) NOT NULL,
    "destination_unit_cost" DECIMAL(14,4) NOT NULL,
    "observations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_fractionations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_movements_product_id_created_at_idx" ON "stock_movements"("product_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_movements_user_id_idx" ON "stock_movements"("user_id");

-- CreateIndex
CREATE INDEX "stock_movements_type_idx" ON "stock_movements"("type");

-- CreateIndex
CREATE INDEX "stock_movements_operation_id_idx" ON "stock_movements"("operation_id");

-- CreateIndex
CREATE INDEX "stock_movements_created_at_idx" ON "stock_movements"("created_at");

-- CreateIndex
CREATE INDEX "stock_fractionations_source_product_id_created_at_idx" ON "stock_fractionations"("source_product_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_fractionations_destination_product_id_created_at_idx" ON "stock_fractionations"("destination_product_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_fractionations_user_id_idx" ON "stock_fractionations"("user_id");

-- CreateIndex
CREATE INDEX "stock_fractionations_created_at_idx" ON "stock_fractionations"("created_at");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_fractionations" ADD CONSTRAINT "stock_fractionations_source_product_id_fkey" FOREIGN KEY ("source_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_fractionations" ADD CONSTRAINT "stock_fractionations_destination_product_id_fkey" FOREIGN KEY ("destination_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_fractionations" ADD CONSTRAINT "stock_fractionations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
