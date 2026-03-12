import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Paper,
    TextField,
    Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../app/store/hooks';

export const CustomerOrdersPage = () => {
  const navigate = useNavigate();
  const { error } = useAppSelector((state) => state.orders);

  const [orderIdSearch, setOrderIdSearch] = useState('');
  const [searchError, setSearchError] = useState('');

  const handleOrderIdSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = orderIdSearch.trim();
    if (!trimmed) {
      setSearchError('Please enter an Order ID');
      return;
    }
    setSearchError('');
    navigate(`/orders/${trimmed}`);
  };

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
          My Orders
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/orders/new')}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Create Order
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Quick lookup by Order ID
        </Typography>
        <form onSubmit={handleOrderIdSearch}>
          <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} alignItems="flex-start">
            <TextField
              size="small"
              placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
              value={orderIdSearch}
              onChange={(e) => {
                setOrderIdSearch(e.target.value);
                if (searchError) setSearchError('');
              }}
              error={!!searchError}
              helperText={searchError}
              sx={{ flex: 1, minWidth: 200 }}
            />
            <Button type="submit" variant="outlined" startIcon={<SearchIcon />} sx={{ whiteSpace: 'nowrap' }}>
              View Order
            </Button>
          </Box>
        </form>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};
