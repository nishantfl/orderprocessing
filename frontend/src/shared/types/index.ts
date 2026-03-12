// Common types shared across the application

export const OrderStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

export const Role = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN'
} as const;

export type Role = typeof Role[keyof typeof Role];

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

/** Order item for create form (no id until saved) */
export interface CreateOrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerId: string;
  tenantId: string;
  status: OrderStatus;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  version: number;
  /** Total order amount (server-calculated, decimal) */
  totalAmount?: number;
  /** Total amount paid so far (server-calculated, decimal) */
  totalPaid?: number;
}

export interface User {
  user_id: string;
  tenant_id: string;
  role: Role;
}

/** User info returned from /v1/auth/users (admin list) */
export interface UserInfo {
  user_id: string;
  username: string;
  role: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  tenant_id: string;
}

export interface PaginationParams {
  page: number;
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

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
