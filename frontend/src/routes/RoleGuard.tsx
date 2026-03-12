import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../app/store/hooks';
import { Role } from '../shared/types';

interface RoleGuardProps {
  allowedRoles: Role[];
}

export const RoleGuard = ({ allowedRoles }: RoleGuardProps) => {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
