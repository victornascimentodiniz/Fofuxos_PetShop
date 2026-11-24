-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "document" VARCHAR(14),
    "phone" VARCHAR(30),
    "whatsapp" VARCHAR(30),
    "email" VARCHAR(150),
    "zip_code" VARCHAR(9),
    "address" VARCHAR(220),
    "number" VARCHAR(20),
    "neighborhood" VARCHAR(100),
    "city" VARCHAR(100),
    "state" VARCHAR(2),
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "species" VARCHAR(50) NOT NULL,
    "breed" VARCHAR(100),
    "sex" VARCHAR(20),
    "birth_date" DATE,
    "weight_kg" DECIMAL(8,3),
    "coat" VARCHAR(120),
    "neutered" BOOLEAN,
    "allergies" TEXT,
    "care_notes" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_settings" (
    "id" VARCHAR(30) NOT NULL DEFAULT 'main',
    "store_name" VARCHAR(150) NOT NULL DEFAULT 'Fofuxos Pet Shop',
    "phone" VARCHAR(30),
    "whatsapp" VARCHAR(30),
    "address" VARCHAR(255),
    "receipt_note" VARCHAR(400),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_document_key" ON "customers"("document");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "customers_active_idx" ON "customers"("active");

-- CreateIndex
CREATE INDEX "pets_customer_id_active_idx" ON "pets"("customer_id", "active");

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
