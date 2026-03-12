import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Container,
    TextField,
    Typography
} from '@mui/material';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks';
import { clearError, login } from '../redux/authSlice';

export const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/orders', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await dispatch(login(formData));
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, sm: 3 },
        boxSizing: 'border-box',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="sm" sx={{ width: '100%' }}>
        <Card sx={{ width: '100%', maxWidth: 420 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom align="center">
              Order Processing System
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom align="center" sx={{ mb: 3 }}>
              Sign in to your account
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Username"
                value={formData.username}
                onChange={handleChange('username')}
                margin="normal"
                required
                autoFocus
                disabled={loading}
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleChange('password')}
                margin="normal"
                required
                disabled={loading}
              />
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight="bold">
                  Demo Accounts:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Admin: admin / admin123
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Customer 1: alice / alice123
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Customer 2: bob / bob123
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Customer 3: charlie / charlie123
                </Typography>
              </Box>
              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                sx={{ mt: 3 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};
