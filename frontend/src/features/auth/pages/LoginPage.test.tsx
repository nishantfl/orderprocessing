import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/test-utils';
import { LoginPage } from './LoginPage';
import { authService } from '../services/authService';

vi.mock('../services/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn().mockReturnValue(null),
    getCurrentUser: vi.fn().mockReturnValue(null),
    setAuthData: vi.fn(),
  },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form with username and password fields', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should display page title', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText('Order Processing System')).toBeInTheDocument();
  });

  it('should show demo accounts info', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText(/demo accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/admin \/ admin123/i)).toBeInTheDocument();
  });

  it('should call login on form submit', async () => {
    const user = userEvent.setup();
    (authService.login as ReturnType<typeof vi.fn>).mockResolvedValue({
      access_token: 'token',
      user: { user_id: '1', username: 'admin', tenant_id: 't1', role: 'ADMIN' },
    });

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/username/i), 'admin');
    await user.type(screen.getByLabelText(/password/i), 'admin123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        username: 'admin',
        password: 'admin123',
      });
    });
  });

  it('should display error when login fails', async () => {
    const user = userEvent.setup();
    (authService.login as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Invalid credentials'),
    );

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/username/i), 'wrong');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});
