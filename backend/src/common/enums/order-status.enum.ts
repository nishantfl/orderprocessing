// What: Enum representing the lifecycle state of an order.
// Why: Keeps status values consistent across DB, code, and API.
export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

