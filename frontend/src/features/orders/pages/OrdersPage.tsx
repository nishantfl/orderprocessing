import { useAppSelector } from '../../../app/store/hooks';
import { CustomerOrdersPage } from './CustomerOrdersPage';
import { OrdersListPage } from './OrdersListPage';

export const OrdersPage = () => {
  const { user } = useAppSelector((state) => state.auth);

  if (user?.role === 'ADMIN') {
    return <OrdersListPage />;
  }

  return <CustomerOrdersPage />;
};
