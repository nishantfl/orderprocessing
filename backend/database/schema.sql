-- Order Processing System - Database Bootstrap Script
--
-- Purpose:
--   This file contains the core DDL (schema) needed to run the service locally.
--   It is intentionally simple and can be executed manually in psql or any
--   PostgreSQL client connected to the `orders_db` database.
--
-- Overview:
--   1) Enum type for order status
--   2) Orders table
--   3) Order items table
--   4) Supporting indexes

----------------------------------------------------------------------
-- 1) Enum type for order status
----------------------------------------------------------------------
-- What:
--   Creates a PostgreSQL ENUM type representing the lifecycle state
--   of an order.
--
-- Why:
--   - Ensures only valid status values are stored in the database.
--   - Keeps DB values aligned with the OrderStatus enum in code.
--   - Makes queries more self-documenting than using a plain TEXT field.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED');
  END IF;
END
$$;

----------------------------------------------------------------------
-- 2) Orders table
----------------------------------------------------------------------
-- What:
--   Main table representing customer orders in a multi-tenant system.
--
-- Columns and rationale:
--   - id:
--       Primary key, UUID, uniquely identifies each order.
--   - tenant_id:
--       Tenant identifier for multi-tenancy isolation and filtering.
--   - customer_id:
--       The customer who owns the order (within a tenant).
--   - status:
--       Current lifecycle state of the order (uses order_status enum).
--   - version:
--       Integer used for optimistic locking on updates.
--   - created_at / updated_at:
--       Audit timestamps managed by the database.
--   - created_by:
--       User who created the order (for auditing and support).
--
-- Notes:
--   - DEFAULT gen_random_uuid() assumes the pgcrypto extension is enabled.
--     If not, you can replace it with uuid_generate_v4() from uuid-ossp.

CREATE TABLE IF NOT EXISTS orders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID        NOT NULL,
    customer_id UUID        NOT NULL,
    status      order_status NOT NULL,
    version     INT         NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  UUID        NOT NULL
);

----------------------------------------------------------------------
-- 3) Order items table
----------------------------------------------------------------------
-- What:
--   Line-item table representing products within an order.
--
-- Columns and rationale:
--   - id:
--       Primary key, UUID for each line item.
--   - order_id:
--       Foreign key to orders.id, linking items to their parent order.
--   - product_id:
--       Product identifier; actual product catalog is external to this service.
--   - quantity:
--       How many units of the product are in the order.
--   - price:
--       Per-unit price at the time of ordering (NUMERIC to avoid float issues).
--
-- Constraints:
--   - FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
--       Ensures that deleting an order also deletes its items, keeping
--       the database consistent and avoiding orphan rows.

CREATE TABLE IF NOT EXISTS order_items (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id   UUID        NOT NULL,
    product_id UUID        NOT NULL,
    quantity   INT         NOT NULL,
    price      NUMERIC     NOT NULL,
    CONSTRAINT fk_order_items_order
      FOREIGN KEY (order_id)
      REFERENCES orders (id)
      ON DELETE CASCADE
);

----------------------------------------------------------------------
-- 4) Supporting indexes
----------------------------------------------------------------------
-- What:
--   Indexes aligned with the main access patterns of the service.
--
-- Why:
--   - tenant_id:
--       Supports listing/filtering orders by tenant, which is common
--       in multi-tenant systems.
--   - customer_id:
--       Supports customer-facing queries (e.g. "my orders").
--   - tenant_id + status:
--       Optimizes queries that list orders by tenant and status,
--       especially important for background jobs transitioning
--       PENDING → PROCESSING.
--   - order_id on order_items:
--       Speeds up fetching all items for a given order.

CREATE INDEX IF NOT EXISTS idx_orders_tenant_id
  ON orders (tenant_id);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id
  ON orders (customer_id);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_status
  ON orders (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON order_items (order_id);

