import type { Order, OrderItem, OrderStatus } from '../types';

/** Chip color mapping for order status display */
export const statusColors: Record<OrderStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  SHIPPED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'error',
};

/** Calculate order total, preferring server-calculated totalAmount when present */
export function getOrderTotal(order: { items?: OrderItem[]; totalAmount?: Order['totalAmount'] }): number {
  if (order.totalAmount != null) {
    return Number(order.totalAmount);
  }
  return order.items?.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0) ?? 0;
}

/** Format order total for display */
export function formatOrderTotal(order: { items?: OrderItem[]; totalAmount?: Order['totalAmount'] }): string {
  return getOrderTotal(order).toFixed(2);
}
