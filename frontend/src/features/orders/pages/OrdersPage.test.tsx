import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/test-utils';
import { OrdersPage } from './OrdersPage';

vi.mock('./OrdersListPage', () => ({
  OrdersListPage: () => <div data-testid="orders-list-page">Admin Orders List</div>,
}));

vi.mock('./CustomerOrdersPage', () => ({
  CustomerOrdersPage: () => <div data-testid="customer-orders-page">Customer Orders</div>,
}));

describe('OrdersPage', () => {
  it('should render OrdersListPage for ADMIN user', () => {
    renderWithProviders(<OrdersPage />, {
      preloadedState: {
        auth: {
          isAuthenticated: true,
          user: { user_id: '1', username: 'admin', tenant_id: 't1', role: 'ADMIN' },
          accessToken: 'token',
          loading: false,
          error: null,
        },
        orders: {
          orders: [],
          selectedOrder: null,
          loading: false,
          error: null,
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        },
      },
    });

    expect(screen.getByTestId('orders-list-page')).toBeInTheDocument();
    expect(screen.getByText('Admin Orders List')).toBeInTheDocument();
  });

  it('should render CustomerOrdersPage for CUSTOMER user', () => {
    renderWithProviders(<OrdersPage />, {
      preloadedState: {
        auth: {
          isAuthenticated: true,
          user: { user_id: '2', username: 'alice', tenant_id: 't1', role: 'CUSTOMER' },
          accessToken: 'token',
          loading: false,
          error: null,
        },
        orders: {
          orders: [],
          selectedOrder: null,
          loading: false,
          error: null,
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        },
      },
    });

    expect(screen.getByTestId('customer-orders-page')).toBeInTheDocument();
    expect(screen.getByText('Customer Orders')).toBeInTheDocument();
  });

  it('should render CustomerOrdersPage when user has no role', () => {
    renderWithProviders(<OrdersPage />, {
      preloadedState: {
        auth: {
          isAuthenticated: true,
          user: { user_id: '3', username: 'bob', tenant_id: 't1', role: '' },
          accessToken: 'token',
          loading: false,
          error: null,
        },
        orders: {
          orders: [],
          selectedOrder: null,
          loading: false,
          error: null,
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        },
      },
    });

    expect(screen.getByTestId('customer-orders-page')).toBeInTheDocument();
  });
});
