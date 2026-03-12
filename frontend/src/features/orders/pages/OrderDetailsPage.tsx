import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import type { SelectChangeEvent } from '@mui/material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks';
import { OrderStatus } from '../../../shared/types';
import { statusColors, getOrderTotal } from '../../../shared/utils/orderUtils';
import { ordersService } from '../services/ordersService';
import { cancelOrder, clearSelectedOrder, fetchOrderById, updateOrderStatus } from '../redux/ordersSlice';

export const OrderDetailsPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedOrder, loading, error } = useAppSelector((state) => state.orders);
  const { user } = useAppSelector((state) => state.auth);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [payments, setPayments] = useState<
    { id: string; amount: string; status: string; createdAt: string }[]
  >([]);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      dispatch(fetchOrderById(orderId));
      ordersService
        .fetchPayments(orderId)
        .then(setPayments)
        .catch(() => setPaymentsError('Failed to load payment history'));
    }
    return () => {
      dispatch(clearSelectedOrder());
    };
  }, [dispatch, orderId]);

  const handleCancelOrder = async () => {
    if (orderId && window.confirm('Are you sure you want to cancel this order? This cannot be undone.')) {
      const result = await dispatch(cancelOrder(orderId));
      if (cancelOrder.fulfilled.match(result)) {
        toast.success('Order cancelled successfully');
      } else {
        toast.error('Failed to cancel order');
      }
    }
  };

  const handleStatusChange = async (event: SelectChangeEvent<OrderStatus>) => {
    const newStatus = event.target.value as OrderStatus;
    if (!orderId || !selectedOrder || selectedOrder.status === newStatus) return;
    const version = selectedOrder.version ?? 1;
    const result = await dispatch(updateOrderStatus({ orderId, status: newStatus, version }));
    if (updateOrderStatus.fulfilled.match(result)) {
      toast.success('Order status updated');
    } else {
      toast.error(result.payload || 'Failed to update order status');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!selectedOrder) {
    return <Alert severity="info">Order not found</Alert>;
  }

  const canCancel =
    selectedOrder.status === OrderStatus.PENDING &&
    (user?.role === 'ADMIN' || user?.user_id === selectedOrder.customerId);

  const isAdmin = user?.role === 'ADMIN';
  const canUpdateStatus = isAdmin && selectedOrder.status !== OrderStatus.CANCELLED;

  const totalAmount = getOrderTotal(selectedOrder);
  const totalPaid = Number(selectedOrder.totalPaid ?? 0);
  const remaining = Math.max(0, totalAmount - totalPaid);
  const canPayRemaining =
    selectedOrder.status === OrderStatus.PENDING &&
    remaining > 0 &&
    user?.role === 'CUSTOMER' &&
    user.user_id === selectedOrder.customerId;

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/orders')}
        sx={{ mb: 2 }}
      >
        Back to Orders
      </Button>

      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Box
          display="flex"
          flexDirection={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          gap={1}
          mb={3}
        >
          <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
            Order Details
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            {canUpdateStatus ? (
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="order-status-label">Status</InputLabel>
                <Select
                  labelId="order-status-label"
                  value={selectedOrder.status}
                  label="Status"
                  onChange={handleStatusChange}
                >
                  {Object.values(OrderStatus).map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Chip
                label={selectedOrder.status}
                color={statusColors[selectedOrder.status]}
                size="medium"
              />
            )}
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: { xs: 2, sm: 3 },
            mb: 3,
          }}
        >
          <Box>
            <Typography variant="subtitle2" color="text.secondary">Order ID</Typography>
            <Typography variant="body1" sx={{ wordBreak: 'break-all' }} gutterBottom>
              {selectedOrder.id}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">Customer ID</Typography>
            <Typography variant="body1" sx={{ wordBreak: 'break-all' }} gutterBottom>
              {selectedOrder.customerId}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">Created At</Typography>
            <Typography variant="body1" gutterBottom>
              {selectedOrder.createdAt ? format(new Date(selectedOrder.createdAt), 'PPpp') : 'N/A'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">Updated At</Typography>
            <Typography variant="body1" gutterBottom>
              {selectedOrder.updatedAt ? format(new Date(selectedOrder.updatedAt), 'PPpp') : 'N/A'}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Order Items
        </Typography>

        {isMobile ? (
          <Stack spacing={1.5}>
            {selectedOrder.items?.map((item) => (
              <Card key={item.id} variant="outlined">
                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="subtitle2">{item.name || item.productId}</Typography>
                  <Box display="flex" justifyContent="space-between" mt={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      {item.quantity} x ${Number(item.price).toFixed(2)}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      ${(Number(item.price) * item.quantity).toFixed(2)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedOrder.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name || item.productId}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">${Number(item.price).toFixed(2)}</TableCell>
                    <TableCell align="right">${(Number(item.price) * item.quantity).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Box
          display="flex"
          flexDirection={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          mt={2}
          gap={2}
        >
          <Box>
            <Typography variant="body2" color="text.secondary">
              Total: <strong>${totalAmount.toFixed(2)}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Paid: <strong>${totalPaid.toFixed(2)}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Remaining: <strong>${remaining.toFixed(2)}</strong>
            </Typography>
          </Box>

          <Box display="flex" gap={2} width={{ xs: '100%', sm: 'auto' }} justifyContent="flex-end">
            {canCancel && (
              <Button
                variant="contained"
                color="error"
                onClick={handleCancelOrder}
                fullWidth={isMobile}
              >
                Cancel Order
              </Button>
            )}
            {canPayRemaining && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate(`/orders/${selectedOrder.id}/pay`)}
                fullWidth={isMobile}
              >
                Pay Remaining
              </Button>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Payments
        </Typography>

        {paymentsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {paymentsError}
          </Alert>
        )}

        {payments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No payments recorded for this order yet.
          </Typography>
        ) : (
          <TableContainer sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Payment ID</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                      {payment.id}
                    </TableCell>
                    <TableCell align="right">${Number(payment.amount).toFixed(2)}</TableCell>
                    <TableCell>{payment.status}</TableCell>
                    <TableCell>
                      {payment.createdAt ? format(new Date(payment.createdAt), 'PPp') : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};
