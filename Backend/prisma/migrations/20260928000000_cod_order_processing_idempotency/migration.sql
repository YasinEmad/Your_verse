-- Cash on Delivery (B7).
--
-- 1. OrderStatus.PROCESSING: an order is PROCESSING from checkout until the
--    parcel is delivered. Under cash on delivery there is no checkout-time
--    payment, so "placed but not yet paid" needed its own state distinct from
--    PENDING; PENDING is retained for rows written before this change and
--    behaves identically as a pre-payment state.
--
-- 2. IdempotencyKey: the §20 retry short-circuit for POST /orders.
ALTER TYPE "OrderStatus" ADD VALUE 'PROCESSING';

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "userId" TEXT,
    "statusCode" INTEGER NOT NULL DEFAULT 201,
    "response" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_scope_key_key" ON "IdempotencyKey"("scope", "key");
