// What: Enum representing the lifecycle state of a payment.
// Why: Keeps payment status values consistent across DB, code, and API.
export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

