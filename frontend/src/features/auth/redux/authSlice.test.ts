import { describe, it, expect, beforeEach, vi } from 'vitest';
import authReducer, { login, logout, clearError } from './authSlice';
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

describe('authSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (authService.getAccessToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (authService.getCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  describe('initial state', () => {
    it('should have correct initial state when not authenticated', () => {
      const state = authReducer(undefined, { type: 'unknown' });
      expect(state).toEqual({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        loading: false,
        error: null,
      });
    });
  });

  describe('logout', () => {
    it('should clear auth state and call authService.logout', () => {
      const stateWithAuth = {
        isAuthenticated: true,
        user: { user_id: '1', username: 'admin', tenant_id: 't1', role: 'ADMIN' },
        accessToken: 'token',
        loading: false,
        error: null,
      };
      const state = authReducer(stateWithAuth, logout());

      expect(authService.logout).toHaveBeenCalled();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const stateWithError = {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        loading: false,
        error: 'Login failed',
      };
      const state = authReducer(stateWithError, clearError());

      expect(state.error).toBeNull();
    });
  });

  describe('login async thunk', () => {
    it('should set loading and clear error on pending', () => {
      const state = authReducer(undefined, { type: login.pending.type });
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set user and token on fulfilled', async () => {
      const response = {
        access_token: 'jwt-token',
        user: { user_id: '1', username: 'admin', tenant_id: 't1', role: 'ADMIN' },
      };
      (authService.login as ReturnType<typeof vi.fn>).mockResolvedValue(response);

      const thunk = login({ username: 'admin', password: 'admin123' });
      const dispatch = vi.fn();
      const getState = vi.fn();

      await thunk(dispatch, getState, undefined);

      expect(authService.setAuthData).toHaveBeenCalledWith('jwt-token', response.user);
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: login.fulfilled.type,
          payload: response,
        }),
      );
    });

    it('should set error on rejected', async () => {
      (authService.login as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Invalid credentials'),
      );

      const thunk = login({ username: 'admin', password: 'wrong' });
      const dispatch = vi.fn();
      const getState = vi.fn();

      await thunk(dispatch, getState, undefined);

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: login.rejected.type,
          payload: 'Invalid credentials',
        }),
      );
    });

    it('should use fallback message when axios error has no message', async () => {
      const axiosError = {
        response: { data: {} },
      };
      (authService.login as ReturnType<typeof vi.fn>).mockRejectedValue(axiosError);

      const thunk = login({ username: 'x', password: 'y' });
      const dispatch = vi.fn();

      await thunk(dispatch, vi.fn(), undefined);

      const rejectedAction = dispatch.mock.calls.find(
        (call) => call[0]?.type === login.rejected.type,
      )?.[0];
      expect(rejectedAction?.payload).toBe('Login failed');
    });
  });
});
