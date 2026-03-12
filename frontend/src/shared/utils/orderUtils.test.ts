import { describe, it, expect } from 'vitest';
import { statusColors, getOrderTotal, formatOrderTotal } from './orderUtils';
import type { OrderItem, OrderStatus } from '../types';

describe('orderUtils', () => {
  describe('statusColors', () => {
    it('should have color for each OrderStatus', () => {
      const statuses: OrderStatus[] = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
      statuses.forEach((status) => {
        expect(statusColors[status]).toBeDefined();
        expect(['default', 'info', 'warning', 'success', 'error']).toContain(statusColors[status]);
      });
    });

    it('should map PENDING to warning', () => {
      expect(statusColors.PENDING).toBe('warning');
    });

    it('should map CANCELLED to error', () => {
      expect(statusColors.CANCELLED).toBe('error');
    });

    it('should map DELIVERED to success', () => {
      expect(statusColors.DELIVERED).toBe('success');
    });
  });

  describe('getOrderTotal', () => {
    it('should return 0 for empty items', () => {
      expect(getOrderTotal({ items: [] })).toBe(0);
    });

    it('should return 0 for undefined items', () => {
      expect(getOrderTotal({})).toBe(0);
    });

    it('should sum single item correctly', () => {
      const items: OrderItem[] = [
        { id: '1', productId: 'p1', name: 'Product', quantity: 2, price: 10 },
      ];
      expect(getOrderTotal({ items })).toBe(20);
    });

    it('should sum multiple items correctly', () => {
      const items: OrderItem[] = [
        { id: '1', productId: 'p1', name: 'A', quantity: 2, price: 10 },
        { id: '2', productId: 'p2', name: 'B', quantity: 1, price: 5.5 },
      ];
      expect(getOrderTotal({ items })).toBe(25.5);
    });

    it('should handle decimal prices', () => {
      const items: OrderItem[] = [
        { id: '1', productId: 'p1', name: 'X', quantity: 3, price: 9.99 },
      ];
      expect(getOrderTotal({ items })).toBeCloseTo(29.97);
    });

    it('should handle string price (from API)', () => {
      const items = [
        { id: '1', productId: 'p1', name: 'Y', quantity: 2, price: '15.50' as unknown as number },
      ];
      expect(getOrderTotal({ items })).toBe(31);
    });
  });

  describe('formatOrderTotal', () => {
    it('should format to 2 decimal places', () => {
      const items: OrderItem[] = [
        { id: '1', productId: 'p1', name: 'Z', quantity: 1, price: 10.5 },
      ];
      expect(formatOrderTotal({ items })).toBe('10.50');
    });

    it('should format zero as 0.00', () => {
      expect(formatOrderTotal({ items: [] })).toBe('0.00');
    });
  });
});
