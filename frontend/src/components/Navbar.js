// Remove useContext since it's not being used
import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  Tooltip,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import EventIcon from '@mui/icons-material/Event';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };
  
  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };
  
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleLogout = () => {
    logout();
    navigate('/');
    handleCloseUserMenu();
  };
  
  const handleNavigate = (path) => {
    navigate(path);
    handleCloseUserMenu();
    setDrawerOpen(false);
  };
  
  const drawer = (
    <Box sx={{ width: 250 }} role="presentation">
      <List>
        <ListItem sx={{ py: 2 }}>
          <Typography variant="h6" component="div">
            IgA Nephropathy
          </Typography>
        </ListItem>
        <Divider />
        
        <ListItem button onClick={() => handleNavigate('/dashboard')}>
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        
        <ListItem button onClick={() => handleNavigate('/doctors')}>
          <ListItemIcon>
            <LocalHospitalIcon />
          </ListItemIcon>
          <ListItemText primary="Find Doctors" />
        </ListItem>
        
        <ListItem button onClick={() => handleNavigate('/appointments')}>
          <ListItemIcon>
            <EventIcon />
          </ListItemIcon>
          <ListItemText primary="Appointments" />
        </ListItem>
        
        <ListItem button onClick={() => handleNavigate('/upload-report')}>
          <ListItemIcon>
            <UploadFileIcon />
          </ListItemIcon>
          <ListItemText primary="Upload Report" />
        </ListItem>
        
        <Divider />
        
        <ListItem button onClick={() => handleNavigate('/profile')}>
          <ListItemIcon>
            <PersonIcon />
          </ListItemIcon>
          <ListItemText primary="Profile" />
        </ListItem>
        
        <ListItem button onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </Box>
  );
  
  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: '#2c2c2c',
        height: '110px', // Increased height of the navbar
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar
          disableGutters
          sx={{
            minHeight: '110px', // Match the height of the AppBar
            px: 2, // Add padding for better spacing
          }}
        >
          {/* Mobile menu icon */}
          {isAuthenticated && (
            <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
              <IconButton
                size="large"
                aria-label="menu"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleDrawerToggle}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
              <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={handleDrawerToggle}
              >
                {drawer}
              </Drawer>
            </Box>
          )}

          {/* Logo */}
          <Typography
            variant="h4" // Increased font size for the logo
            noWrap
            component={RouterLink}
            to="/"
            sx={{
              mr: 4, // Increased margin for spacing
              display: 'flex',
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.2rem', // Slightly increased letter spacing
              color: 'inherit',
              textDecoration: 'none',
              background: 'linear-gradient(90deg,rgb(233, 193, 189),rgb(0, 251, 255), #6bffb8)', // Gradient colors
              backgroundClip: 'text',
              textFillColor: 'transparent', // Makes the gradient visible
              animation: 'gradientAnimation 3s infinite', // Apply animation
              '@keyframes gradientAnimation': {
                '0%': {
                  backgroundPosition: '0% 50%',
                },
                '50%': {
                  backgroundPosition: '100% 50%',
                },
                '100%': {
                  backgroundPosition: '0% 50%',
                },
              },
              backgroundSize: '200% 200%', // Smooth gradient transition
            }}
          >
            ThirdOp
          </Typography>

          {/* Desktop navigation */}
          {isAuthenticated ? (
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 4 }}>
              <Button
                onClick={() => navigate('/dashboard')}
                sx={{
                  my: 2,
                  mx: 2, // Increased horizontal margin for spacing
                  color: 'white',
                  fontSize: '1.2rem', // Increased font size
                  display: 'block',
                  transition: 'transform 0.2s ease, color 0.2s ease',
                  '&:hover': {
                    color: '#f5f5f5',
                    transform: 'scale(1.1)',
                  },
                }}
              >
                Dashboard
              </Button>
              <Button
                onClick={() => navigate('/doctors')}
                sx={{
                  my: 2,
                  mx: 2, // Increased horizontal margin for spacing
                  color: 'white',
                  fontSize: '1.2rem', // Increased font size
                  display: 'block',
                  transition: 'transform 0.2s ease, color 0.2s ease',
                  '&:hover': {
                    color: '#f5f5f5',
                    transform: 'scale(1.1)',
                  },
                }}
              >
                Find Doctors
              </Button>
              <Button
                onClick={() => navigate('/appointments')}
                sx={{
                  my: 2,
                  mx: 2, // Increased horizontal margin for spacing
                  color: 'white',
                  fontSize: '1.2rem', // Increased font size
                  display: 'block',
                  transition: 'transform 0.2s ease, color 0.2s ease',
                  '&:hover': {
                    color: '#f5f5f5',
                    transform: 'scale(1.1)',
                  },
                }}
              >
                Appointments
              </Button>
              <Button
                onClick={() => navigate('/upload-report')}
                sx={{
                  my: 2,
                  mx: 2, // Increased horizontal margin for spacing
                  color: 'white',
                  fontSize: '1.2rem', // Increased font size
                  display: 'block',
                  transition: 'transform 0.2s ease, color 0.2s ease',
                  '&:hover': {
                    color: '#f5f5f5',
                    transform: 'scale(1.1)',
                  },
                }}
              >
                Find
              </Button>
              <Button
                onClick={() => navigate('/analytics')}
                sx={{
                  my: 2,
                  mx: 2,
                  color: 'white',
                  fontSize: '1.2rem',
                  display: 'block',
                  transition: 'transform 0.2s ease, color 0.2s ease',
                  '&:hover': {
                    color: '#f5f5f5',
                    transform: 'scale(1.1)',
                  },
                }}
              >
                Analytics
              </Button>
            </Box>
          ) : (
            <Box sx={{ flexGrow: 1 }} />
          )}

          {/* User menu */}
          {isAuthenticated ? (
            <Box sx={{ flexGrow: 0 }}>
              <Tooltip title="Open settings">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  {/* Fix comment in JSX by using braces */}
                  <Avatar 
                    sx={{ 
                      bgcolor: user ? 'primary.main' : 'grey.500',
                      width: 32, 
                      height: 32 
                    }}
                  >
                    {user ? user.name.charAt(0).toUpperCase() : 'G'}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                sx={{ mt: '45px' }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                <MenuItem onClick={() => handleNavigate('/profile')}>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  <Typography textAlign="center">Profile</Typography>
                </MenuItem>
                {/* Fix comment in JSX by using braces */}
                <MenuItem>{/* Some comment text */}</MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  <Typography textAlign="center">Logout</Typography>
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                component={RouterLink}
                to="/login"
                sx={{ color: 'white', fontSize: '1.2rem', display: 'block' }}
              >
                Login
              </Button>
              <Button
                component={RouterLink}
                to="/register"
                variant="contained"
                color="secondary"
                sx={{ fontSize: '1.2rem', display: 'block' }}
              >
                Register
              </Button>
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;

// Remove these lines:
// const handleClose = () => {
//   setAnchorEl(null); // Assuming you have setAnchorEl from useState
// };
// <MenuItem onClick={handleClose}>My account</MenuItem>