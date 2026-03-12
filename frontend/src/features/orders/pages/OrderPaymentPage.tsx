import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getOrderTotal } from '../../../shared/utils/orderUtils';
import { ordersService } from '../services/ordersService';

export const OrderPaymentPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<'FULL' | 'PARTIAL'>('FULL');

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        setError('Order id is missing');
        return;
      }
      try {
        const order = await ordersService.fetchOrderById(orderId);
        const totalAmount =
          order.totalAmount != null ? Number(order.totalAmount) : getOrderTotal(order);
        const totalPaid = order.totalPaid != null ? Number(order.totalPaid) : 0;
        const remainingAmount = totalAmount - totalPaid;
        if (remainingAmount <= 0) {
          setError('This order is already fully paid');
        } else {
          setRemaining(remainingAmount);
          // Default to full payment
          setPaymentType('FULL');
          setAmount(remainingAmount);
        }
      } catch {
        setError('Failed to load order payment details');
      }
    };
    loadOrder();
  }, [orderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || remaining == null) {
      return;
    }
    if (amount <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { order } = await ordersService.createPayment(orderId, amount);
      const totalAmount = order.totalAmount ?? 0;
      const totalPaid = order.totalPaid ?? 0;
      const remainingAmount = totalAmount - totalPaid;

      if (remainingAmount < 0) {
        // Should not happen because backend blocks overpayment, but guard just in case.
        toast.error('Payment resulted in negative remaining amount');
      } else if (remainingAmount === 0) {
        toast.success('Payment successful. Order is now processing.');
        navigate('/orders');
        return;
      } else {
        setRemaining(remainingAmount);
        // After a partial payment, default to full payment of new remaining.
        setPaymentType('FULL');
        setAmount(remainingAmount);
        toast.success('Partial payment successful');
      }
    } catch (err: any) {
      const response = err?.response?.data;
      if (response?.errorCode === 'OVERPAYMENT_NOT_ALLOWED' && typeof response?.message === 'string') {
        toast.error(response.message);
        // Try to parse remaining amount from message like "Remaining amount is X.XX"
        const match = response.message.match(/Remaining amount is ([0-9]+\.[0-9]{2})/);
        if (match) {
          const remainingAmount = parseFloat(match[1]);
          setRemaining(remainingAmount);
          setAmount(remainingAmount);
        }
      } else {
        toast.error(response?.message || 'Payment failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Button onClick={() => navigate('/orders')} sx={{ mb: 2 }}>
        Back to Orders
      </Button>

      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Pay for Order
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {remaining != null && (
          <Typography sx={{ mb: 2 }}>
            Remaining amount to pay: <strong>${remaining.toFixed(2)}</strong>
          </Typography>
        )}

        <form onSubmit={handleSubmit}>
          <RadioGroup
            row
            value={paymentType}
            onChange={(e) => {
              const value = e.target.value as 'FULL' | 'PARTIAL';
              setPaymentType(value);
              if (value === 'FULL' && remaining != null) {
                setAmount(remaining);
              }
            }}
            sx={{ mb: 2 }}
          >
            <FormControlLabel value="FULL" control={<Radio />} label="Full payment" />
            <FormControlLabel value="PARTIAL" control={<Radio />} label="Partial payment" />
          </RadioGroup>

          <TextField
            label="Amount to pay"
            type="number"
            fullWidth
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ mb: 2 }}
            disabled={paymentType === 'FULL'}
          />

          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button variant="outlined" onClick={() => navigate('/orders')}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={loading || remaining == null}>
              Pay
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

