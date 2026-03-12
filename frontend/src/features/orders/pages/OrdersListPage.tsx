import { FilterList as FilterListIcon } from '@mui/icons-material';
import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    type SelectChangeEvent,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks';
import type { Order } from '../../../shared/types';
import { OrderStatus } from '../../../shared/types';
import type { UserInfo } from '../../../shared/types';
import { statusColors, formatOrderTotal } from '../../../shared/utils/orderUtils';
import { fetchOrders } from '../redux/ordersSlice';
import apiClient from '../../../shared/services/apiClient';

export const OrdersListPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { orders, loading, error, pagination } = useAppSelector((state) => state.orders);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    const loadUsers = async () => {
      try {
        const { data } = await apiClient.get<UserInfo[]>('/v1/auth/users');
        const map: Record<string, string> = {};
        data.forEach((u) => { map[u.user_id] = u.username; });
        setUserMap(map);
      } catch {
        // non-critical
      }
    };
    loadUsers();
  }, [user?.role]);

  useEffect(() => {
    // Defer to avoid double-fetch in React Strict Mode (dev double-mount).
    const timeoutId = setTimeout(() => {
      dispatch(fetchOrders({
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter === '' ? undefined : statusFilter
      }));
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [dispatch, page, rowsPerPage, statusFilter]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      dispatch(fetchOrders({
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter === '' ? undefined : statusFilter
      }));
    }, 180000);
    return () => clearInterval(intervalId);
  }, [dispatch, page, rowsPerPage, statusFilter]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value as OrderStatus | '');
    setPage(0);
  };

  const getOrderTotal = (order: Order) => formatOrderTotal(order);

  if (loading && orders.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        display="flex"
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        gap={2}
        mb={3}
      >
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          Orders
        </Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="status-filter-label">Filter Status</InputLabel>
          <Select
            labelId="status-filter-label"
            value={statusFilter}
            label="Filter Status"
            onChange={handleStatusFilterChange}
            startAdornment={<FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} />}
          >
            <MenuItem value="">All Statuses</MenuItem>
            {Object.values(OrderStatus).map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isMobile ? (
        <Stack spacing={2}>
          {orders.map((order) => (
            <Card
              key={order.id}
              sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.2s' }}
              onClick={() => navigate(`/orders/${order.id}`)}
            >
              <CardContent sx={{ pb: '12px !important' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Chip
                    label={userMap[order.customerId] || order.customerId.substring(0, 8)}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={order.status || 'UNKNOWN'}
                    color={order.status ? statusColors[order.status] : 'default'}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', mb: 0.5 }}>
                  {order.id}
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body1" fontWeight="bold">
                    ${getOrderTotal(order)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {order.createdAt ? format(new Date(order.createdAt), 'PPp') : 'N/A'}
                </Typography>
              </CardContent>
            </Card>
          ))}
          <TablePagination
            component="div"
            rowsPerPageOptions={[5, 10, 25]}
            count={pagination.total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ '.MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'center' } }}
          />
        </Stack>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Total Amount</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Created At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow
                  key={order.id}
                  hover
                  onClick={() => navigate(`/orders/${order.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all', maxWidth: 280 }}>
                    {order.id}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={userMap[order.customerId] || order.customerId.substring(0, 8)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.status || 'UNKNOWN'}
                      color={order.status ? statusColors[order.status] : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>${getOrderTotal(order)}</TableCell>
                  <TableCell>{order.items?.length || 0}</TableCell>
                  <TableCell>
                    {order.createdAt ? format(new Date(order.createdAt), 'PPp') : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={pagination.total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      )}
    </Box>
  );
};
