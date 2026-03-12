import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from './authService';
import apiClient from '../../../shared/services/apiClient';

vi.mock('../../../shared/services/apiClient', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('login', () => {
    it('should call API and return login response', async () => {
      const response = {
        data: {
          access_token: 'token',
          user: { user_id: '1', username: 'admin', tenant_id: 't1', role: 'ADMIN' },
        },
      };
      (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue(response);

      const result = await authService.login({
        username: 'admin',
        password: 'admin123',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/v1/auth/login', {
        username: 'admin',
        password: 'admin123',
      });
      expect(result).toEqual(response.data);
    });
  });

  describe('logout', () => {
    it('should remove token and user from localStorage', () => {
      localStorage.setItem('access_token', 'token');
      localStorage.setItem('user', '{}');

      authService.logout();

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('getAccessToken', () => {
    it('should return token from localStorage', () => {
      localStorage.setItem('access_token', 'my-token');
      expect(authService.getAccessToken()).toBe('my-token');
    });

    it('should return null when no token', () => {
      expect(authService.getAccessToken()).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return parsed user from localStorage', () => {
      const user = { user_id: '1', username: 'admin', tenant_id: 't1', role: 'ADMIN' };
      localStorage.setItem('user', JSON.stringify(user));
      expect(authService.getCurrentUser()).toEqual(user);
    });

    it('should return null when no user', () => {
      expect(authService.getCurrentUser()).toBeNull();
    });

    it('should return null and clear storage on invalid JSON', () => {
      localStorage.setItem('user', 'invalid-json');
      expect(authService.getCurrentUser()).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('setAuthData', () => {
    it('should store token and user in localStorage', () => {
      const user = { user_id: '1', username: 'admin', tenant_id: 't1', role: 'ADMIN' };
      authService.setAuthData('token', user);

      expect(localStorage.getItem('access_token')).toBe('token');
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual(user);
    });
  });
});
