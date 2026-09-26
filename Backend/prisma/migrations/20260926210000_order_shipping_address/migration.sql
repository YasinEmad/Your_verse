-- Shipping label data (F10). Nullable so existing orders stay valid; the
-- shipping dashboard reads exactly these three fields and nothing else from the
-- customer, instead of joining the full User row.
ALTER TABLE "Order" ADD COLUMN "recipientName" TEXT;
ALTER TABLE "Order" ADD COLUMN "recipientPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingAddress" JSONB;
