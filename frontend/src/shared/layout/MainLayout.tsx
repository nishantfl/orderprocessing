import { AccountCircle } from '@mui/icons-material';
import {
    AppBar,
    Box,
    Button,
    Container,
    IconButton,
    Menu,
    MenuItem,
    Toolbar,
    Typography,
} from '@mui/material';
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { logout } from '../../features/auth/redux/authSlice';

export const MainLayout = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    handleClose();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', flex: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Order Processing System
          </Typography>

          <Button color="inherit" onClick={() => navigate('/orders')}>
            {user?.role === 'ADMIN' ? 'All Orders' : 'My Orders'}
          </Button>

          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem disabled>
              <Typography variant="body2">
                {user?.username} ({user?.role})
              </Typography>
            </MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container component="main" 
      maxWidth={false}
      disableGutters
      sx={{
        flexGrow: 1,
        width: '100%',
        maxWidth: '100%',
        py: { xs: 2, sm: 4 },
        px: { xs: 2, sm: 3, md: 4, lg: 5 },
      }}>
        <Outlet />
      </Container>
    </Box>
  );
};
