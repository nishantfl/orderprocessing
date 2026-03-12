# Order Processing System

A full-stack, multi-tenant order lifecycle management application with a React frontend and NestJS backend. Handles order creation, status transitions, role-based access control, and automated background processing.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Architecture](#architecture)
5. [Data Flow](#data-flow)
6. [Functionalities](#functionalities)
7. [Workflows](#workflows)
8. [API Reference](#api-reference)
9. [Getting Started](#getting-started)
10. [Environment Configuration](#environment-configuration)

---

## Overview

The Order Processing System is a complete solution for managing orders across their lifecycle—from creation through delivery. It supports:

- **Multi-tenancy** — Orders are scoped by tenant
- **Role-based access** — Customers see only their orders; Admins see all tenant orders
- **Background processing** — Automated status transitions (PENDING → PROCESSING → SHIPPED → DELIVERED)
- **Optimistic locking** — Safe concurrent updates with version control
- **JWT authentication** — Stateless, scalable auth

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.x | UI framework |
| **TypeScript** | 5.9.x | Type safety |
| **Vite** | 7.x | Build tool & dev server |
| **Redux Toolkit** | 2.x | State management |
| **React Router** | 7.x | Client-side routing |
| **Material-UI (MUI)** | 7.x | UI components & theming |
| **Axios** | 1.x | HTTP client |
| **React Toastify** | 11.x | Notifications |
| **date-fns** | 4.x | Date formatting |
| **uuid** | 13.x | Correlation IDs |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **NestJS** | 11.x | API framework |
| **TypeScript** | 5.7.x | Type safety |
| **TypeORM** | 0.3.x | ORM & database access |
| **PostgreSQL** | - | Primary database |
| **Redis** | - | Job queue (BullMQ) & rate limiting |
| **BullMQ** | 5.x | Background job processing |
| **Passport JWT** | 4.x | Authentication |
| **class-validator** | 0.15.x | Request validation |
| **Pino** | 10.x | Structured logging |
| **@nestjs/throttler** | 6.x | Rate limiting |

### Infrastructure

| Component | Purpose |
|-----------|---------|
| **PostgreSQL** | Persistent storage for orders, order items |
| **Redis** | BullMQ job queue, rate limit storage, distributed locks |

---

## Project Structure

```
order processing/
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── app/              # Redux store
│   │   ├── features/         # Feature modules
│   │   │   ├── auth/         # Login, JWT handling
│   │   │   ├── orders/       # Order list, create, details, cancel
│   │   │   └── products/    # Product catalog for order creation
│   │   ├── shared/           # Layout, components, API client
│   │   └── routes/           # PrivateRoute, RoleGuard
│   └── package.json
│
├── backend/                  # NestJS API
│   ├── src/
│   │   ├── common/           # Guards, decorators, filters, middleware
│   │   ├── config/           # Database, Redis config
│   │   ├── modules/
│   │   │   ├── auth/         # Login, JWT strategy
│   │   │   ├── orders/       # Order CRUD, status, cancel
│   │   │   ├── products/     # Product catalog
│   │   │   ├── jobs/         # BullMQ worker (status transitions)
│   │   │   └── health/       # Health checks
│   │   └── main.ts
│   └── package.json
│
└── README.md                 # This file
```

---

## Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React + Vite)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│
│  │ LoginPage   │  │ OrdersPage  │  │ CreateOrder │  │ OrderDetailsPage    ││
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘│
│         │                │                │                    │          │
│         └────────────────┴────────────────┴────────────────────┘          │
│                                    │                                        │
│                          Redux + Axios (apiClient)                          │
│                                    │                                        │
│                    JWT in header │ Correlation-ID │ 401 → /login            │
└───────────────────────────────────┼────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (NestJS)                               │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Correlation ID Middleware → Logging Interceptor → Throttler      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    │                                      │
│  ┌─────────────────────────────────▼─────────────────────────────────┐   │
│  │  JwtAuthGuard → RolesGuard → Controller → Service → TypeORM       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    │                                      │
│  ┌─────────────────────────────────▼─────────────────────────────────┐   │
│  │  PostgreSQL (orders, order_items)                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  BullMQ Worker (every 5 min) → Redis Lock → Order Status Updates │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Request Flow (API)

```
Client Request
      │
      ▼
Correlation ID Middleware (generate or forward X-Correlation-Id)
      │
      ▼
Logging Interceptor (request/response logging)
      │
      ▼
Throttler Guard (rate limit by tenant/user)
      │
      ▼
JWT Auth Guard (validate token, attach user to request)
      │
      ▼
Roles Guard (check CUSTOMER vs ADMIN permissions)
      │
      ▼
Controller → Service → TypeORM Repository → PostgreSQL
```

### Background Worker Flow

```
BullMQ Repeatable Job (every 5 minutes)
      │
      ▼
Acquire Redis Distributed Lock (TTL 4 min)
      │
      ▼
Process PENDING → PROCESSING (orders older than 5 min)
      │
      ▼
Process PROCESSING → SHIPPED (orders older than 5 min)
      │
      ▼
Process SHIPPED → DELIVERED (orders older than 10 min)
      │
      ▼
Release Lock
```

---

## Data Flow

### Order Lifecycle States

```
PENDING ──(5 min)──► PROCESSING ──(5 min)──► SHIPPED ──(10 min)──► DELIVERED
    │                     │                      │
    │                     │                      │
    └─────────────────────┴──────────────────────┴──► CANCELLED (user/admin action)
```

### Frontend State Flow

```
Component
    │
    ▼
Dispatch Redux Action (e.g. createOrder)
    │
    ▼
Async Thunk → API Service (ordersService, authService, etc.)
    │
    ▼
apiClient (Axios)
    │  • Add JWT from localStorage
    │  • Add X-Correlation-Id
    │  • Handle 401 → redirect to /login
    │  • Handle 429 → log rate limit
    │
    ▼
Backend API
    │
    ▼
Redux State Updated → Component Re-renders
```

### Data Model

**Orders Table**

| Column      | Type      | Description                |
|-------------|-----------|----------------------------|
| id          | uuid PK   | Order identifier           |
| tenant_id   | uuid      | Multi-tenant isolation     |
| customer_id | uuid      | Order owner                |
| status      | enum      | PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED |
| version     | int       | Optimistic locking         |
| created_at  | timestamp | Creation time              |
| updated_at  | timestamp | Last update                |
| created_by  | uuid      | User who created           |

**Order Items Table**

| Column     | Type    | Description   |
|------------|---------|---------------|
| id         | uuid PK | Item ID       |
| order_id   | uuid FK | Parent order  |
| product_id | uuid    | Product ref   |
| quantity   | int     | Quantity      |
| price      | numeric | Unit price    |


---

## Functionalities

### Authentication

- **Login** — Username, password, tenant ID → JWT + user info
- **Token storage** — JWT stored in `localStorage`
- **Auto-logout** — 401 responses clear token and redirect to `/login`
- **Protected routes** — `PrivateRoute` guards all app routes except `/login`

### Customer Role

- View own orders (paginated)
- Create orders with multiple items (product selection from catalog)
- View order details
- Cancel pending orders

### Admin Role

- View all orders in tenant (paginated)
- View any order details
- Update order status (PENDING → PROCESSING → SHIPPED → DELIVERED)
- Cancel any order
- Access users list (`GET /v1/auth/users`)

### Background Processing

- **Every 5 minutes** — BullMQ worker runs
- **PENDING → PROCESSING** — Orders pending > 5 min
- **PROCESSING → SHIPPED** — Orders processing > 5 min
- **SHIPPED → DELIVERED** — Orders shipped > 10 min
- **Distributed lock** — Only one worker instance runs globally (Redis)

### Security & Reliability

- **JWT** — Stateless auth with `user_id`, `tenant_id`, `role` in payload
- **Rate limiting** — Redis-backed, per tenant/user (configurable TTL/limit)
- **Optimistic locking** — `version` column prevents concurrent overwrites; 409 on conflict
- **Health checks** — `GET /v1/health` returns DB + Redis status (200 healthy, 503 if DB down)

### Observability

- **Correlation IDs** — `X-Correlation-Id` on every request; echoed in response and logs
- **Structured logging** — Pino JSON logs with `ts`, `level`, `method`, `url`, `statusCode`, `correlationId`, `tenantId`, `userId`
- **Error responses** — Consistent shape: `{ timestamp, path, correlationId, errorCode, message }`

---

## Workflows

### Create Order

1. User (Customer/Admin) navigates to "Create Order"
2. Frontend fetches products from `GET /v1/products`
3. User selects products, quantities; submits form
4. `POST /v1/orders` with `{ items: [{ productId, quantity, price }] }`
5. Backend sets `tenantId`, `customerId`, `createdBy` from JWT
6. Order created with status `PENDING`
7. Frontend redirects to order details or list

### Cancel Order

1. User clicks "Cancel" on order details
2. `POST /v1/orders/:id/cancel`
3. Backend checks: CUSTOMER can cancel only own orders; ADMIN can cancel any
4. Status set to `CANCELLED` (only if currently PENDING or PROCESSING)

### Update Status (Admin)

1. Admin selects new status on order details
2. `PATCH /v1/orders/:id/status` with `{ status, version }`
3. Backend validates version (optimistic lock); updates if match
4. Returns 409 if version mismatch

### Automated Status Transitions

1. BullMQ job runs every 5 minutes
2. Worker acquires Redis lock
3. Bulk updates: PENDING→PROCESSING, PROCESSING→SHIPPED, SHIPPED→DELIVERED (by age thresholds)
4. Worker releases lock

---

## API Reference

### Auth

| Method | Endpoint           | Auth | Description      |
|--------|--------------------|------|------------------|
| POST   | /v1/auth/login     | No   | Login, returns JWT |
| GET    | /v1/auth/users     | Admin| List users       |

### Orders

| Method | Endpoint                | Auth   | Description     |
|--------|-------------------------|--------|-----------------|
| GET    | /v1/orders              | Yes    | List orders (paginated) |
| POST   | /v1/orders              | Yes    | Create order    |
| GET    | /v1/orders/:id          | Yes    | Get order       |
| PATCH  | /v1/orders/:id/status   | Admin  | Update status   |
| POST   | /v1/orders/:id/cancel   | Yes    | Cancel order    |

### Products

| Method | Endpoint       | Auth | Description      |
|--------|----------------|------|------------------|
| GET    | /v1/products   | Yes  | List products    |

### Health

| Method | Endpoint   | Auth | Description      |
|--------|------------|------|------------------|
| GET    | /v1/health  | No   | Health check     |

### Pagination

- **Offset:** `?page=1&limit=20`
- **Cursor:** `?cursor=2026-03-01T12:00:00Z&limit=20`
- **Filter:** `?status=PENDING`

---

## Getting Started

> **Reviewers:** See **[QUICKSTART.md](QUICKSTART.md)** for a streamlined setup guide with SQL schema scripts and Docker commands.

### Prerequisites

- **Node.js** 18+ 
- **PostgreSQL** (e.g. `orders_db` on `localhost:5432`)
- **Redis** (e.g. `localhost:6379`)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DB and Redis credentials
npm run start:dev
```

Backend runs at `http://localhost:3000`.

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Ensure VITE_API_BASE_URL=http://localhost:3000
npm run dev
```

Frontend runs at `http://localhost:5173`.

### Seed Users (for testing)

| Username | Password   | Role    |
|----------|------------|---------|
| admin    | admin123   | ADMIN   |
| alice    | alice123   | CUSTOMER|
| bob      | bob123     | CUSTOMER|
| charlie  | charlie123 | CUSTOMER|

All share `tenant_id`: `00000000-0000-0000-0000-000000000001`.

### Testing

```bash
# Backend (unit + e2e)
cd backend && npm run test        # Unit tests
cd backend && npm run test:e2e    # E2E tests (auth)
cd backend && npm run test:all    # Both

# Frontend
cd frontend && npm run test       # Unit & component tests (Vitest)
cd frontend && npm run test:watch # Watch mode
```

Frontend tests cover Redux slices (auth, orders), services, shared utilities, and core components (LoginPage, OrdersPage, PrivateRoute).

### Production Build

```bash
# Backend
cd backend && npm run build && npm run start:prod

# Frontend
cd frontend && npm run build
# Serve dist/ with nginx, Vercel, etc.
```

---

## Environment Configuration

### Backend (`.env`)

| Variable       | Description              | Default        |
|----------------|--------------------------|----------------|
| NODE_ENV       | Environment              | development    |
| PORT           | API port                 | 3000           |
| DB_HOST        | PostgreSQL host          | localhost      |
| DB_PORT        | PostgreSQL port          | 5432           |
| DB_USERNAME    | DB user                  | postgres       |
| DB_PASSWORD    | DB password              | -              |
| DB_NAME        | Database name            | orders_db      |
| REDIS_HOST     | Redis host               | localhost      |
| REDIS_PORT     | Redis port               | 6379           |
| JWT_SECRET     | JWT signing secret       | -              |
| JWT_EXPIRES_IN | Token expiry (seconds)   | 3600           |
| THROTTLE_TTL   | Rate limit window (ms)   | 60000          |
| THROTTLE_LIMIT | Requests per window      | 100            |
| LOG_LEVEL      | Log level                | info           |

### Frontend (`.env`)

| Variable           | Description        | Default              |
|--------------------|--------------------|----------------------|
| VITE_API_BASE_URL  | Backend API URL    | http://localhost:3000 |

---

## Additional Documentation

- **[backend/ARCHITECTURE.md](backend/ARCHITECTURE.md)** — Detailed backend architecture and tech decisions
- **[backend/README.md](backend/README.md)** — Backend-specific setup and structure
- **[backend/FRONTEND_IMPLEMENTATION.md](backend/FRONTEND_IMPLEMENTATION.md)** — Frontend implementation notes

---

*Order Processing System — Full-stack implementation complete.*
