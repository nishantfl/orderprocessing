import { Add as AddIcon, ArrowBack as ArrowBackIcon, Delete as DeleteIcon } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    FormControl,
    IconButton,
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
    TextField,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { CreateOrderItem } from '../../../shared/types';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks';
import { createOrder } from '../redux/ordersSlice';
import { productsService, type Product } from '../../products/services/productsService';

export const CreateOrderPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.orders);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<CreateOrderItem[]>([
    { productId: '', name: '', quantity: 1, price: 0 },
  ]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await productsService.fetchProducts();
        setProducts(data);
      } catch {
        toast.error('Failed to load products');
      }
    };
    loadProducts();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { productId: '', name: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof CreateOrderItem, value: string | number) => {
    const newItems = [...items];
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          productId: product.id,
          name: product.name,
          price: product.price,
        };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => total + item.quantity * item.price, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some((item) => !item.productId || item.quantity <= 0 || item.price <= 0)) {
      toast.error('Please fill in all item details with valid values');
      return;
    }
    const result = await dispatch(createOrder({ items }));
    if (!createOrder.fulfilled.match(result)) {
      toast.error('Failed to create order');
      return;
    }

    const createdOrder: any = result.payload;
    toast.success('Order created successfully');

    const proceedToPayment = window.confirm('Order created. Do you want to proceed to payment now?');
    if (proceedToPayment && createdOrder && createdOrder.id) {
      navigate(`/orders/${createdOrder.id}/pay`);
    } else if (createdOrder && createdOrder.id) {
      navigate(`/orders/${createdOrder.id}`);
    } else {
      navigate('/orders');
    }
  };

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
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          Create New Order
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {isMobile ? (
            <Stack spacing={2}>
              {items.map((item, index) => (
                <Card key={index} variant="outlined">
                  <CardContent sx={{ pb: '12px !important' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle2">Item {index + 1}</Typography>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length === 1}
                        aria-label={`Remove item ${index + 1}`}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                      <Select
                        value={item.productId}
                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                        displayEmpty
                        required
                      >
                        <MenuItem value="" disabled>Select a product</MenuItem>
                        {products.map((product) => (
                          <MenuItem key={product.id} value={product.id}>
                            {product.name} - ${product.price.toFixed(2)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Box display="flex" gap={1.5}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Qty"
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        inputProps={{ min: 1 }}
                        required
                      />
                      <TextField
                        fullWidth
                        size="small"
                        label="Price"
                        type="number"
                        value={item.price}
                        disabled
                      />
                    </Box>
                    <Typography variant="body2" fontWeight="bold" textAlign="right" mt={1}>
                      Subtotal: ${(item.quantity * item.price).toFixed(2)}
                    </Typography>
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
                    <TableCell>Quantity</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Subtotal</TableCell>
                    <TableCell width={50}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <Select
                            value={item.productId}
                            onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                            displayEmpty
                            required
                          >
                            <MenuItem value="" disabled>Select a product</MenuItem>
                            {products.map((product) => (
                              <MenuItem key={product.id} value={product.id}>
                                {product.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                          inputProps={{ min: 1 }}
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={item.price}
                          disabled
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </TableCell>
                      <TableCell>${(item.quantity * item.price).toFixed(2)}</TableCell>
                      <TableCell>
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveItem(index)}
                          disabled={items.length === 1}
                          aria-label={`Remove item ${index + 1}`}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
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
            alignItems={{ xs: 'stretch', sm: 'center' }}
            gap={2}
            mt={2}
          >
            <Button startIcon={<AddIcon />} onClick={handleAddItem} variant="outlined" fullWidth={isMobile}>
              Add Item
            </Button>
            <Typography variant="h6" textAlign={{ xs: 'right', sm: 'left' }}>
              Total: ${calculateTotal().toFixed(2)}
            </Typography>
          </Box>

          <Box
            display="flex"
            flexDirection={{ xs: 'column-reverse', sm: 'row' }}
            justifyContent="flex-end"
            gap={2}
            mt={3}
          >
            <Button variant="outlined" onClick={() => navigate('/orders')} fullWidth={isMobile}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={loading} fullWidth={isMobile}>
              Create Order
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};
