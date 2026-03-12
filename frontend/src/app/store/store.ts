import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../features/auth/redux/authSlice';
import ordersReducer from '../../features/orders/redux/ordersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    orders: ordersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
