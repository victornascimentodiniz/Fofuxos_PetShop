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
