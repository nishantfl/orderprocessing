import { Box, CssBaseline } from '@mui/material';
import { Provider } from 'react-redux';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { store } from './app/store/store';
import { LoginPage } from './features/auth/pages/LoginPage';
import { CreateOrderPage } from './features/orders/pages/CreateOrderPage';
import { OrderDetailsPage } from './features/orders/pages/OrderDetailsPage';
import { OrdersPage } from './features/orders/pages/OrdersPage';
import { OrderPaymentPage } from './features/orders/pages/OrderPaymentPage';
import { PrivateRoute } from './routes/PrivateRoute';
import { MainLayout } from './shared/layout/MainLayout';

function App() {
  return (
    <Provider store={store}>
      <CssBaseline />
      <Box sx={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <BrowserRouter>
          <Box component="div" sx={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route element={<PrivateRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<Navigate to="/orders" replace />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/orders/new" element={<CreateOrderPage />} />
                  <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
                  <Route path="/orders/:orderId/pay" element={<OrderPaymentPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/orders" replace />} />
            </Routes>
          </Box>
        </BrowserRouter>
        <ToastContainer position="top-right" autoClose={3000} />
      </Box>
    </Provider>
  );
}

export default App;
