import { Role } from '../../../shared/types';

export interface AuthState {
  isAuthenticated: boolean;
  user: UserInfo | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
}

export interface UserInfo {
  user_id: string;
  username: string;
  tenant_id: string;
  role: Role;
}

export interface LoginRequest {
  username: string;
  password: string;
  tenant_id?: string;
}

export interface LoginResponse {
  access_token: string;
  user: UserInfo;
}
