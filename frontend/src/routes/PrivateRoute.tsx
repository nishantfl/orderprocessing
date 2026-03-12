import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../app/store/hooks';

export const PrivateRoute = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};
