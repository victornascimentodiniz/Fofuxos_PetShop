-- CreateTable
CREATE TABLE "attendance_groups" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "icon" VARCHAR(40) NOT NULL DEFAULT 'package',
    "color" VARCHAR(7) NOT NULL DEFAULT '#AD4679',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_group_products" (
    "group_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "attendance_group_products_pkey" PRIMARY KEY ("group_id","product_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_groups_name_key" ON "attendance_groups"("name");

-- CreateIndex
CREATE INDEX "attendance_groups_active_sort_order_idx" ON "attendance_groups"("active", "sort_order");

-- CreateIndex
CREATE INDEX "attendance_group_products_product_id_idx" ON "attendance_group_products"("product_id");

-- AddForeignKey
ALTER TABLE "attendance_group_products" ADD CONSTRAINT "attendance_group_products_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "attendance_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_group_products" ADD CONSTRAINT "attendance_group_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
