import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getErrorMessage } from '../../../shared/utils/errorUtils';
import { authService } from '../services/authService';
import type { AuthState, LoginRequest, LoginResponse } from '../types';

const initialState: AuthState = {
  isAuthenticated: !!authService.getAccessToken(),
  user: authService.getCurrentUser(),
  accessToken: authService.getAccessToken(),
  loading: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk<LoginResponse, LoginRequest, { rejectValue: string }>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      authService.setAuthData(response.access_token, response.user);
      return response;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error, 'Login failed'));
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      authService.logout();
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<LoginResponse>) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.access_token;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Login failed';
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
