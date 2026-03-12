## Order payments and status flow

This document describes how orders should interact with payments, support partial payments, and transition from `PENDING` to `PROCESSING` based strictly on payment completion.

### 1. Analyze current order & background processing

- **Inspect order model**
  - Open `order.entity.ts` and note:
    - Current `status` field and enum values.
    - Any existing payment-related fields (e.g. `isPaid`, `paidAmount`).
    - Relations to user/customer and items.
- **Find all status-changing code**
  - In `orders.service.ts`, list all methods that:
    - Create orders.
    - Update order status (`PENDING` → `PROCESSING` → others).
- **Locate background processor**
  - Find any scheduled job/queue that:
    - Reads `PENDING` orders.
    - Automatically sets them to `PROCESSING`.

### 2. Design & add the `Payment` entity

- **Define payment status enum**
  - Create a `PaymentStatus` enum (e.g. `common/enums/payment-status.enum.ts`) with:
    - `PENDING`
    - `CONFIRMED`
    - `FAILED` (optional for later gateway use).
-- **Create `Payment` entity**
  - In the `orders` module, define `Payment` with at least:
    - `id`
    - `order` (`ManyToOne` to `Order`)
    - `amount` (`DECIMAL(10,2)` in the database)
    - `status` (`PaymentStatus`)
    - `createdAt` / `updatedAt`
-- **Add relation and totals on `Order`**
  - Add `payments: Payment[]` (`OneToMany`) on `Order`.
  - Add `totalAmount` and `totalPaid` as `DECIMAL(10,2)` columns directly on `Order`.
  - Compute `totalAmount` when creating the order and update `totalPaid` inside payment transactions.

### 3. Extend order model with derived payment info

-- **Expose payment-related fields**
  - On `Order` entity or via DTOs, expose:
    - `totalAmount` (stored `DECIMAL(10,2)`).
    - `totalPaid` (stored `DECIMAL(10,2)`).
    - `remainingAmount = totalAmount - totalPaid` (computed in code, using integer cents to avoid floating-point errors).
    - `paymentStatus` (`UNPAID`, `PARTIALLY_PAID`, `PAID` as a derived enum/string).
-- **Implement helper methods in services**
  - Implement helpers that operate on integer cents (e.g. `toCents`) to calculate:
    - Remaining amount.
    - Whether an order is fully paid.

### 4. Implement payment-aware status rules in `OrdersService`

- **Centralize processing transition**
  - Implement a method, e.g. `updateOrderStatusForPayment(order: Order): Promise<Order>`:
    - Recalculate `totalPaid` and `remainingAmount`.
    - If `remainingAmount === 0` and `order.status === PENDING`, set `status = PROCESSING`.
    - Save and return the order.
- **Guard generic status changes**
  - In any existing methods that set `status = PROCESSING` directly:
    - If `remainingAmount > 0`, throw `HttpException` with `errorCode = PAYMENT_REQUIRED`.

### 5. Create `PaymentsService`

- **Responsibilities**
  - Wrap payment creation and order update inside a **single database transaction** using `DataSource.transaction`.
  - Fetch order by `orderId` (ensuring it belongs to the current user when applicable) with a pessimistic write lock.
  - Validate payment amount vs remaining based on stored `totalAmount` and `totalPaid`.
  - Persist `Payment` with `status = CONFIRMED` for now (no real gateway yet).
  - Update `order.totalPaid` and, if fully paid, `order.status` to `PROCESSING`, then save the order.
- **`createPayment(orderId, amount)` flow**
  - Start a transaction:
    - Load the order with a `pessimistic_write` lock.
    - If not found → throw `ORDER_NOT_FOUND`.
    - If `order.status !== PENDING` → throw `ORDER_NOT_PAYABLE` (block payments on `PROCESSING`, `COMPLETED`, `CANCELLED`, etc.).
    - Convert `totalAmount`, `totalPaid`, and `amount` to integer cents to avoid floating-point bugs.
    - Compute `remaining = totalAmount - totalPaid`.
    - If `remaining <= 0` → throw `ORDER_ALREADY_FULLY_PAID`.
    - If `amount <= 0` → throw `INVALID_PAYMENT_AMOUNT`.
    - If `amount > remaining`:
      - Throw `OVERPAYMENT_NOT_ALLOWED` with a message that includes the `remaining` amount.
      - Frontend can show a popup and reset the amount input to the correct remaining amount.
    - If `0 < amount <= remaining`:
      - Create `Payment` with that amount, `status = CONFIRMED`.
      - Update `order.totalPaid` by adding the amount.
      - If `totalPaid === totalAmount` → set `order.status = PROCESSING`.
      - Save both entities inside the same transaction and return the updated order and payment.

### 6. Expose payment endpoints in controller

- **DTO**
  - `CreatePaymentDto`:
    - `amount: number`
    - Optional `paymentType: 'FULL' | 'PARTIAL'` (for UI only).
- **Endpoints**
  - `POST /orders/:orderId/payments`:
    - Parses `orderId` and body.
    - Calls `PaymentsService.createPayment(orderId, dto)`.
    - Returns new payment and/or updated order.
  - Optional `GET /orders/:orderId/payments`:
    - List all payments for an order for UI/debugging.

### 7. Keep order creation simple, adjust responses

- **Order creation**
  - `POST /orders`:
    - Creates order with `status = PENDING`.
    - Does not create any payment.
- **Order responses**
  - Ensure responses include:
    - `totalAmount`
    - `totalPaid`
    - `remainingAmount`
    - `paymentStatus`
    - `status`
  - This lets the frontend:
    - Ask the user “Proceed to payment now?” after creation.
    - Show current remaining amount on the payment page.

### 8. Remove the background processor

- **Remove promotion logic**
  - In any scheduler/queue/cron:
    - Delete or refactor code that finds `PENDING` orders and sets them to `PROCESSING` without payment checks.
- **Adjust any dependent code**
  - Any logic that relied on time-based auto-processing should now depend on `status = PROCESSING` being set by payment completion.

### 9. Validation and error handling

- **Standardize error codes**
  - In payment and status methods, use `HttpException` with:
    - `PAYMENT_REQUIRED` (trying to process unpaid order).
    - `ORDER_ALREADY_FULLY_PAID`.
    - `OVERPAYMENT_NOT_ALLOWED`.
  - The existing `HttpExceptionFilter` will format output with `errorCode`, `message`, and `correlationId`.
- **Authorization**
  - Ensure guards/roles enforce:
    - Customers can only pay for their own orders.
    - No public endpoint can arbitrarily set `status = PROCESSING`.

### 10. Tests and manual verification

- **Automated tests**
  - Create tests that cover:
    - Create order → `PENDING`, `totalPaid = 0`.
    - Partial payment → new `Payment`, order stays `PENDING`, `remaining` decreases.
    - Final payment → `remaining` becomes 0, order moves to `PROCESSING`.
    - Overpayment attempt → `OVERPAYMENT_NOT_ALLOWED` with correct remaining amount.
    - Attempt to set `PROCESSING` without full payment → `PAYMENT_REQUIRED`.
- **Manual checks**
  - Use Postman/Insomnia to:
    - `POST /orders` → verify `PENDING` order.
    - `POST /orders/:id/payments` with:
      - Partial amounts.
      - Final payment to complete.
      - Overpayment to verify error.
    - Confirm order status and totals reflect all payments correctly.

