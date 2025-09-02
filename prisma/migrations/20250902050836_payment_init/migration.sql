-- CreateTable
CREATE TABLE "public"."invoices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "payment_method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "gateway_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
