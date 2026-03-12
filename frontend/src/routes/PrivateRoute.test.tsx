import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { PrivateRoute } from './PrivateRoute';
import { createTestStore } from '../test/test-utils';

const defaultOrdersState = {
  orders: [],
  selectedOrder: null,
  loading: false,
  error: null,
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
};

function renderWithRouter(
  authState: { isAuthenticated: boolean; user: unknown; accessToken: string | null },
) {
  const store = createTestStore({
    auth: {
      ...authState,
      loading: false,
      error: null,
    },
    orders: defaultOrdersState,
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/protected" element={<PrivateRoute />}>
            <Route index element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('PrivateRoute', () => {
  it('should render protected content when authenticated', () => {
    renderWithRouter({
      isAuthenticated: true,
      user: { user_id: '1', username: 'admin', tenant_id: 't1', role: 'ADMIN' },
      accessToken: 'token',
    });

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', () => {
    renderWithRouter({
      isAuthenticated: false,
      user: null,
      accessToken: null,
    });

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
