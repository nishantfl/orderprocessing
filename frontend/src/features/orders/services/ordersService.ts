import apiClient from '../../../shared/services/apiClient';
import type { Order } from '../../../shared/types';
import { OrderStatus } from '../../../shared/types';
import type { CreateOrderRequest, FetchOrdersParams, OrdersResponse } from '../types';

export const ordersService = {
  fetchOrders: async (params: FetchOrdersParams = {}): Promise<OrdersResponse> => {
    const { page = 1, limit = 10, status } = params;
    const offset = (page - 1) * limit;
    const response = await apiClient.get<OrdersResponse>('/v1/orders', {
      params: { offset, limit, status }
    });
    return response.data;
  },

  fetchOrderById: async (orderId: string): Promise<Order> => {
    const response = await apiClient.get<Order>(`/v1/orders/${orderId}`);
    return response.data;
  },

  createOrder: async (orderData: CreateOrderRequest): Promise<Order> => {
    const response = await apiClient.post<Order>('/v1/orders', orderData);
    return response.data;
  },

  createPayment: async (orderId: string, amount: number): Promise<{ order: Order }> => {
    const response = await apiClient.post<{ order: Order }>(`/v1/orders/${orderId}/payments`, {
      amount,
    });
    return response.data;
  },

  fetchPayments: async (
    orderId: string,
  ): Promise<
    {
      id: string;
      amount: string;
      status: string;
      createdAt: string;
    }[]
  > => {
    const response = await apiClient.get<
      {
        id: string;
        amount: string;
        status: string;
        createdAt: string;
      }[]
    >(`/v1/orders/${orderId}/payments`);
    return response.data;
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus, version: number): Promise<Order> => {
    const response = await apiClient.patch<Order>(`/v1/orders/${orderId}/status`, { status, version });
    return response.data;
  },

  cancelOrder: async (orderId: string): Promise<Order> => {
    const response = await apiClient.post<Order>(`/v1/orders/${orderId}/cancel`);
    return response.data;
  }
};
