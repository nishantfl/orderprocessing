import { PaginationUtil } from './pagination.util';

describe('PaginationUtil', () => {
  describe('normalize', () => {
    it('should return default offset and limit when not provided', () => {
      const result = PaginationUtil.normalize(undefined as unknown as number, undefined as unknown as number);
      expect(result).toEqual({ offset: 0, limit: 20 });
    });

    it('should use provided offset and limit', () => {
      const result = PaginationUtil.normalize(10, 5);
      expect(result).toEqual({ offset: 10, limit: 5 });
    });

    it('should clamp negative offset to 0', () => {
      const result = PaginationUtil.normalize(-5, 10);
      expect(result.offset).toBe(0);
    });

    it('should clamp limit to maxLimit (default 100)', () => {
      const result = PaginationUtil.normalize(0, 200);
      expect(result.limit).toBe(100);
    });

    it('should clamp limit below 1 to 1', () => {
      const result = PaginationUtil.normalize(0, 0);
      expect(result.limit).toBe(1);
    });

    it('should respect custom maxLimit', () => {
      const result = PaginationUtil.normalize(0, 50, 30);
      expect(result.limit).toBe(30);
    });
  });

  describe('format', () => {
    it('should format paginated response with data and meta', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const result = PaginationUtil.format(data, 10, 0, 2);

      expect(result.data).toEqual(data);
      expect(result.meta).toEqual({
        offset: 0,
        limit: 2,
        total: 10,
        hasMore: true,
      });
    });

    it('should set hasMore to false when no more pages', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const result = PaginationUtil.format(data, 2, 0, 2);

      expect(result.meta.hasMore).toBe(false);
    });

    it('should handle empty data', () => {
      const result = PaginationUtil.format([], 0, 0, 10);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.hasMore).toBe(false);
    });
  });
});
