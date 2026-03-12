# Order Processing System — Backend

NestJS API for order lifecycle management. See [root README](../README.md) for full project docs.

> Same content in `ARCHITECTURE.md` so it’s easy to share a stakeholder-facing doc even if we later add developer-only setup instructions here.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [High-Level Architecture](#high-level-architecture)
3. [Tech Stack & Rationale](#tech-stack--rationale)
4. [Project Structure](#project-structure)
5. [Data Model](#data-model)
6. [API Design](#api-design)
7. [Background Processing](#background-processing)
8. [Security & Reliability](#security--reliability)
9. [Observability](#observability)
10. [Environment & Deployment](#environment--deployment)

---

## Executive Summary

The Order Processing System is a multi-tenant NestJS API that handles order lifecycle management, from creation through status transitions. It uses PostgreSQL for storage, Redis for caching and job queues, and a background worker to process pending orders asynchronously.

---

## High-Level Architecture

### Request Flow (API)

```
Client
   │
   ▼
Auth Guard (JWT)
   │
   ▼
Correlation ID Middleware
   │
   ▼
Logging Interceptor
   │
   ▼
Controller
   │
   ▼
Service (business logic + transactions)
   │
   ▼
TypeORM Repository
   │
   ▼
PostgreSQL
```

### Background Worker Flow

```
BullMQ Worker (every 5 min)
   │
   ▼
OrderService
   │
   ▼
PostgreSQL
```

---

## Tech Stack & Rationale

### Backend Framework: NestJS

| Choice | Alternative | Why We Chose NestJS |
|--------|-------------|---------------------|
| **NestJS** | Express, Fastify, Koa | NestJS provides built-in support for modules, dependency injection, guards, interceptors, and filters. It enforces a consistent structure and scales well as the team grows. Express would require more glue code; Fastify is faster but has a smaller ecosystem and fewer batteries-included patterns. |

---

### Database: PostgreSQL

| Choice | Alternative | Why We Chose PostgreSQL |
|--------|-------------|-------------------------|
| **PostgreSQL** | MySQL, MongoDB, SQL Server | PostgreSQL offers robust JSON support, strong ACID guarantees, and excellent support for UUIDs and enums. It handles concurrent updates well with row-level locking. MySQL is simpler but has weaker handling of complex queries; MongoDB would require denormalization for relational order data; SQL Server adds licensing cost. |

---

### ORM: TypeORM

| Choice | Alternative | Why We Chose TypeORM |
|--------|-------------|----------------------|
| **TypeORM** | Prisma, MikroORM, Drizzle | TypeORM integrates natively with NestJS (`@nestjs/typeorm`), supports migrations, transactions, and optimistic locking. Prisma has better DX and type-safety but weaker transaction patterns for complex flows; MikroORM and Drizzle are lighter but less integrated with NestJS. |

---

### Job Queue: BullMQ + Redis

| Choice | Alternative | Why We Chose BullMQ + Redis |
|--------|-------------|-----------------------------|
| **BullMQ + Redis** | Agenda + MongoDB, RabbitMQ, AWS SQS | BullMQ is Redis-based, provides repeatable jobs, retries, and distributed job locking. It fits well with NestJS (`@nestjs/bull`). Agenda requires MongoDB; RabbitMQ adds operational complexity; SQS is cloud-specific and adds vendor lock-in. Redis is already needed for rate limiting, so reusing it for queues reduces infrastructure. |

---

### Authentication: JWT

| Choice | Alternative | Why We Chose JWT |
|--------|-------------|------------------|
| **JWT** | Session cookies, OAuth2 opaque tokens | JWTs are stateless and scale horizontally. They carry `user_id`, `tenant_id`, and `role` in the payload, which simplifies multi-tenant authorization. Session cookies require server-side session storage; opaque tokens require token introspection on every request. |

---

### Validation: class-validator + class-transformer

| Choice | Alternative | Why We Chose class-validator |
|--------|-------------|-----------------------------|
| **class-validator** | Zod, Joi, manual | Integrates with NestJS pipes and DTOs via decorators. Validates request bodies and query params declaratively. Zod is more type-safe and flexible but requires different NestJS integration; Joi is schema-based and less TypeScript-native. |

---

### Logging: Pino

| Choice | Alternative | Why We Chose Pino |
|--------|-------------|-------------------|
| **Pino** | Winston, Bunyan, console | Pino is one of the fastest Node.js loggers and produces JSON by default. It works well with correlation IDs and structured observability. Winston is more feature-rich but slower; Bunyan is similar to Pino but less maintained. |

---

### Rate Limiting: @nestjs/throttler

| Choice | Alternative | Why We Chose Nest Throttler |
|--------|-------------|-----------------------------|
| **@nestjs/throttler** | express-rate-limit, custom Redis | Native NestJS integration, supports storage backends (Redis). Scoped by `tenant_id` and `user_id` for multi-tenant fairness. Custom Redis gives more control but requires more code. |

---

## Project Structure

```
src/
├── main.ts
├── config/
│   ├── database.config.ts
│   └── redis.config.ts
├── database/
│   └── data-source.ts
├── common/
│   ├── middleware/
│   │   └── correlation-id.middleware.ts
│   ├── interceptors/
│   │   └── logging.interceptor.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── decorators/
│   │   ├── roles.decorator.ts
│   │   └── user.decorator.ts
│   └── enums/
│       ├── role.enum.ts
│       └── order-status.enum.ts
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   └── jwt.strategy.ts
│   ├── orders/
│   │   ├── orders.module.ts
│   │   ├── orders.controller.ts
│   │   ├── orders.service.ts
│   │   ├── entities/
│   │   │   ├── order.entity.ts
│   │   │   └── order-item.entity.ts
│   │   └── dto/
│   │       ├── create-order.dto.ts
│   │       ├── list-orders.dto.ts
│   │       └── update-status.dto.ts
│   ├── jobs/
│   │   ├── jobs.module.ts
│   │   └── order-processing.worker.ts
│   └── health/
│       ├── health.controller.ts
│       └── health.service.ts
└── utils/
    └── pagination.util.ts
```

---

## Data Model

### Normalized Schema

We use a normalized relational schema (not JSON blobs) for order items to support indexing, referential integrity, and efficient querying.

### Orders Table

| Column      | Type      | Notes                |
|-------------|-----------|----------------------|
| id          | uuid PK   |                      |
| tenant_id   | uuid      | Multi-tenant         |
| customer_id | uuid      |                      |
| status      | enum      | OrderStatus          |
| version     | int       | Optimistic locking   |
| created_at  | timestamp |                      |
| updated_at  | timestamp |                      |
| created_by  | uuid      | Audit                |

**Indexes:** `tenant_id`, `customer_id`, `(tenant_id, status)`

### Order Items Table

| Column     | Type    |
|------------|---------|
| id         | uuid PK |
| order_id   | uuid FK |
| product_id | uuid    |
| quantity   | int     |
| price      | numeric |

**Index:** `order_id`

### Why Optimistic Locking?

Concurrent updates to the same order could overwrite each other. The `version` column ensures that only one update succeeds; others receive `409 VERSION_MISMATCH` and can retry with fresh data.

---

## API Design

### Versioning

All endpoints are under `/v1` to allow future breaking changes without affecting existing clients.

### Endpoints

| Method | Endpoint                | Description   |
|--------|-------------------------|---------------|
| POST   | /v1/orders              | Create order  |
| GET    | /v1/orders              | List orders   |
| GET    | /v1/orders/:id          | Get order     |
| PATCH  | /v1/orders/:id/status   | Update status |
| POST   | /v1/orders/:id/cancel   | Cancel order  |
| GET    | /v1/health              | Health check  |

### Pagination

- **Admin / dashboards:** Offset-based (`?page=1&limit=20`) — simple and familiar.
- **Mobile / high-volume clients:** Cursor-based (`?cursor=2026-03-01T12:00:00Z&limit=20`) — constant performance at scale.

### Role-Based Access

| Role     | Permissions       |
|----------|-------------------|
| CUSTOMER | Own orders only   |
| ADMIN    | All tenant orders |

---

## Background Processing

### Job: Pending → Processing

- **Schedule:** Every 5 minutes (BullMQ repeatable job)
- **Logic:** `UPDATE orders SET status='PROCESSING', version=version+1 WHERE status='PENDING'`
- **Implementation:** TypeORM QueryBuilder (not raw SQL) for schema consistency
- **Safety:** Idempotent; `WHERE status='PENDING'` prevents duplicate processing
- **Contention:** Redis distributed lock (TTL 4 min) ensures only one worker runs globally

---

## Security & Reliability

### Authentication Flow

JWT payload: `{ user_id, tenant_id, role }`

Guards: `JwtAuthGuard` → `RolesGuard`

### Rate Limiting

- Scope: `tenant_id` + `user_id` (Redis key: `rate_limit:{tenant}:{user}`)
- Example: 10 requests/sec on `POST /orders`
- Prevents one tenant from impacting others

### Health Checks

| State      | Condition      | HTTP Status |
|------------|----------------|-------------|
| healthy    | DB + Redis OK  | 200         |
| degraded   | Redis down     | 200         |
| unhealthy  | DB down        | 503         |

Redis affects background jobs only; API remains operational when Redis is down. Database failure is critical and returns 503.

---

## Observability

### Correlation IDs

- Header: `X-Correlation-Id`
- Flow: Client may send; otherwise server generates UUID
- Attached to: `req.correlationId`, response header, logs

### Structured Logging (Pino)

Example fields: `ts`, `level`, `method`, `url`, `statusCode`, `responseTimeMs`, `correlationId`, `tenantId`, `userId`

### Global Exception Filter

Standard response shape:

```json
{
  "timestamp": "...",
  "path": "/v1/orders/123",
  "correlationId": "uuid",
  "errorCode": "ORDER_NOT_FOUND",
  "message": "..."
}
```

---

## Environment & Deployment

### Database Migrations

| Environment | synchronize | Strategy      |
|-------------|-------------|---------------|
| Development | true        | Auto-sync     |
| Production  | false       | Migrations    |

Production uses `typeorm migration:generate` and `migration:run` to avoid schema drift and accidental column deletion.

### Local Setup

- **PostgreSQL:** `orders_db` on `localhost:5432`
- **Redis:** Required for BullMQ and rate limiting

### Testing

```bash
npm run test        # Unit tests (OrdersService, OrdersController, AuthService, PaginationUtil)
npm run test:e2e    # E2E tests (Auth login flow)
npm run test:all    # Run both unit and e2e tests
```

Unit tests cover order creation, retrieval, listing (admin/customer), status updates, cancellation, auth login, and pagination. E2E tests verify the auth API without external services.

---

## Summary of Key Decisions

| Area              | Decision                          | Driver                                   |
|-------------------|-----------------------------------|------------------------------------------|
| Framework         | NestJS                            | Structure, DI, built-in patterns         |
| Database          | PostgreSQL                        | ACID, UUIDs, enums, concurrency          |
| ORM               | TypeORM                           | NestJS integration, optimistic locking   |
| Queue             | BullMQ + Redis                    | Repeatable jobs, reuse Redis             |
| Auth              | JWT                               | Stateless, multi-tenant friendly         |
| Pagination        | Offset + Cursor                   | Simplicity vs. scalability               |
| Health            | 3-state (ok/degraded/unhealthy)   | Redis non-critical for core API          |
| Worker            | TypeORM + Redis lock              | Consistency and single-active execution  |

---

*This document is intended for stakeholder review. For implementation details, see the source code and API documentation.*
