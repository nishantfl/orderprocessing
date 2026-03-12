-- Order Processing System - Database Schema
-- Run this script to create tables manually (e.g. when NODE_ENV=production or synchronize=false)
-- Usage: psql -U postgres -d orders_db -f init-schema.sql

-- Create order status enum (idempotent: skip if already exists)
-- TypeORM uses "orders_status_enum" for table "orders", column "status"
DO $$ BEGIN
  CREATE TYPE "orders_status_enum" AS ENUM (
    'PENDING',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  status "orders_status_enum" NOT NULL DEFAULT 'PENDING',
  version INTEGER NOT NULL DEFAULT 1,
  "totalAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "totalPaid"   DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdBy" UUID NOT NULL
);

-- Indexes for orders (matches TypeORM entity indexes)
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders ("tenantId");
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders ("customerId");
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders ("tenantId", status);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "productId" UUID NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  name VARCHAR(255)
);

-- Index for order items (FK lookups)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items ("orderId");

-- Payment status enum (idempotent)
DO $$ BEGIN
  CREATE TYPE "payments_status_enum" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status "payments_status_enum" NOT NULL DEFAULT 'PENDING',
  reference VARCHAR(255),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for payments (FK lookups)
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments ("orderId");
