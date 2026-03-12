// What: Utility for offset-based pagination calculations and response formatting.
// Why: Keeps pagination logic DRY and provides consistent API response structure.

export interface PaginationParams {
  offset: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export class PaginationUtil {
  /**
   * Normalize pagination parameters with defaults and constraints.
   */
  static normalize(
    offset: number = 0,
    limit: number = 20,
    maxLimit: number = 100,
  ): PaginationParams {
    const normalizedOffset = Math.max(0, offset);
    const normalizedLimit = Math.min(Math.max(1, limit), maxLimit);

    return {
      offset: normalizedOffset,
      limit: normalizedLimit,
    };
  }

  /**
   * Format a paginated response with data and metadata.
   */
  static format<T>(
    data: T[],
    total: number,
    offset: number,
    limit: number,
  ): PaginatedResponse<T> {
    return {
      data,
      meta: {
        offset,
        limit,
        total,
        hasMore: offset + data.length < total,
      },
    };
  }
}
