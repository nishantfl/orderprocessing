import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore, PreloadedState } from '@reduxjs/toolkit';
import authReducer from '../features/auth/redux/authSlice';
import ordersReducer from '../features/orders/redux/ordersSlice';

export function createTestStore(preloadedState?: PreloadedState<{
  auth: ReturnType<typeof authReducer>;
  orders: ReturnType<typeof ordersReducer>;
}>) {
  return configureStore({
    reducer: {
      auth: authReducer,
      orders: ordersReducer,
    },
    preloadedState,
  });
}

interface WrapperProps {
  children: React.ReactNode;
  preloadedState?: PreloadedState<{
    auth: ReturnType<typeof authReducer>;
    orders: ReturnType<typeof ordersReducer>;
  }>;
}

function AllTheProviders({ children, preloadedState }: WrapperProps) {
  const store = createTestStore(preloadedState);
  return (
    <Provider store={store}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Provider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { preloadedState?: WrapperProps['preloadedState'] },
) {
  const { preloadedState, ...renderOptions } = options ?? {};
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders preloadedState={preloadedState}>{children}</AllTheProviders>
    ),
    ...renderOptions,
  });
}

export * from '@testing-library/react';
