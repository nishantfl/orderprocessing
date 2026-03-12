import apiClient from '../../../shared/services/apiClient';
import type { LoginRequest, LoginResponse } from '../types';

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/v1/auth/login', credentials);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
      localStorage.removeItem('user');
      return null;
    }
  },

  getAccessToken: () => {
    return localStorage.getItem('access_token');
  },

  setAuthData: (token: string, user: LoginResponse['user']) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }
};
