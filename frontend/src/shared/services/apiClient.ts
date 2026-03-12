import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Add correlation ID to every request
        config.headers['x-correlation-id'] = uuidv4();

        // Add JWT token if available
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && originalRequest) {
          // Clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }

        // Handle 429 Too Many Requests
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          toast.error(
            retryAfter
              ? `Too many requests. Please try again in ${retryAfter} seconds.`
              : 'Too many requests. Please try again later.'
          );
        }

        return Promise.reject(error);
      }
    );
  }

  public getClient(): AxiosInstance {
    return this.client;
  }
}

export const apiClient = new ApiClient().getClient();
export default apiClient;
