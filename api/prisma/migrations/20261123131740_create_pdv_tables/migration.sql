-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('OPENING', 'SUPPLY', 'WITHDRAWAL', 'CASH_SALE', 'CASH_REFUND');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalePaymentMethod" AS ENUM ('CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER');

-- CreateTable
CREATE TABLE "cash_sessions" (
    "id" UUID NOT NULL,
    "terminal_code" VARCHAR(80) NOT NULL,
    "opened_by_id" UUID NOT NULL,
    "closed_by_id" UUID,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
    "opening_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "closing_declared_amount" DECIMAL(14,2),
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" UUID NOT NULL,
    "cash_session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reason" VARCHAR(180) NOT NULL,
    "notes" TEXT,
    "sale_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "client_request_id" UUID NOT NULL,
    "operation_id" UUID NOT NULL,
    "cash_session_id" UUID NOT NULL,
    "operator_id" UUID NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "subtotal" DECIMAL(16,2) NOT NULL,
    "discount_amount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(16,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_name" VARCHAR(150) NOT NULL,
    "unit" "ProductUnit" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "total_amount" DECIMAL(16,2) NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_payments" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "method" "SalePaymentMethod" NOT NULL,
    "amount" DECIMAL(16,2) NOT NULL,
    "received_amount" DECIMAL(16,2),
    "change_amount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "reference" VARCHAR(120),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_sessions_terminal_code_status_idx" ON "cash_sessions"("terminal_code", "status");

-- CreateIndex
CREATE INDEX "cash_sessions_opened_by_id_opened_at_idx" ON "cash_sessions"("opened_by_id", "opened_at");

-- CreateIndex
CREATE INDEX "cash_sessions_status_idx" ON "cash_sessions"("status");

-- CreateIndex
CREATE INDEX "cash_movements_cash_session_id_created_at_idx" ON "cash_movements"("cash_session_id", "created_at");

-- CreateIndex
CREATE INDEX "cash_movements_user_id_idx" ON "cash_movements"("user_id");

-- CreateIndex
CREATE INDEX "cash_movements_sale_id_idx" ON "cash_movements"("sale_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_number_key" ON "sales"("number");

-- CreateIndex
CREATE UNIQUE INDEX "sales_client_request_id_key" ON "sales"("client_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_operation_id_key" ON "sales"("operation_id");

-- CreateIndex
CREATE INDEX "sales_cash_session_id_created_at_idx" ON "sales"("cash_session_id", "created_at");

-- CreateIndex
CREATE INDEX "sales_operator_id_created_at_idx" ON "sales"("operator_id", "created_at");

-- CreateIndex
CREATE INDEX "sales_status_created_at_idx" ON "sales"("status", "created_at");

-- CreateIndex
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items"("sale_id");

-- CreateIndex
CREATE INDEX "sale_items_product_id_idx" ON "sale_items"("product_id");

-- CreateIndex
CREATE INDEX "sale_payments_sale_id_idx" ON "sale_payments"("sale_id");

-- CreateIndex
CREATE INDEX "sale_payments_method_idx" ON "sale_payments"("method");

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_cash_session_id_fkey" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_cash_session_id_fkey" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Adicionar ao migration.sql gerado pelo Prisma antes de aplicar.
-- Se alguma restricao ja existir, nao a duplique.

CREATE UNIQUE INDEX "cash_sessions_one_open_per_terminal"
  ON "cash_sessions" ("terminal_code")
  WHERE "status" = 'OPEN';

ALTER TABLE "cash_sessions"
  ADD CONSTRAINT "cash_sessions_nonnegative_amounts"
  CHECK ("opening_amount" >= 0 AND
         ("closing_declared_amount" IS NULL OR "closing_declared_amount" >= 0));

ALTER TABLE "cash_sessions"
  ADD CONSTRAINT "cash_sessions_valid_closure"
  CHECK (
    ("status" = 'OPEN' AND "closed_at" IS NULL AND "closed_by_id" IS NULL AND "closing_declared_amount" IS NULL)
    OR
    ("status" = 'CLOSED' AND "closed_at" IS NOT NULL AND "closed_by_id" IS NOT NULL AND "closing_declared_amount" IS NOT NULL)
  );

ALTER TABLE "cash_movements"
  ADD CONSTRAINT "cash_movements_positive_amount"
  CHECK ("amount" > 0);

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_valid_totals"
  CHECK ("subtotal" >= 0 AND "discount_amount" >= 0 AND
         "discount_amount" <= "subtotal" AND
         "total_amount" = "subtotal" - "discount_amount" AND "total_amount" > 0);

ALTER TABLE "sale_items"
  ADD CONSTRAINT "sale_items_positive_values"
  CHECK ("quantity" > 0 AND "unit_price" >= 0 AND "total_amount" >= 0);

ALTER TABLE "sale_payments"
  ADD CONSTRAINT "sale_payments_valid_values"
  CHECK ("amount" > 0 AND "change_amount" >= 0 AND
    (
      ("method" = 'CASH' AND "received_amount" IS NOT NULL
        AND "received_amount" >= "amount"
        AND "change_amount" = "received_amount" - "amount")
      OR
      ("method" <> 'CASH' AND "received_amount" IS NULL AND "change_amount" = 0)
    )
  );

