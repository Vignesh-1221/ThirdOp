import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LockIcon from '@mui/icons-material/Lock';
import SaveIcon from '@mui/icons-material/Save';

const Profile = () => {
  const { user, updateUser } = useContext(AuthContext);
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordMode, setPasswordMode] = useState(false);
  
  useEffect(() => {
    if (user) {
      setProfileData(prevData => ({
        ...prevData,
        name: user.name,
        email: user.email
      }));
    }
  }, [user]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const response = await axios.put('/api/auth/profile', {
        name: profileData.name
      });
      
      updateUser(response.data.user);
      setSuccess('Profile updated successfully');
      setLoading(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.response?.data?.message || 'Failed to update profile');
      setLoading(false);
    }
  };
  
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (profileData.newPassword !== profileData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (profileData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      await axios.put('/api/auth/password', {
        currentPassword: profileData.currentPassword,
        newPassword: profileData.newPassword
      });
      
      setSuccess('Password updated successfully');
      setProfileData(prevData => ({
        ...prevData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setLoading(false);
    } catch (error) {
      console.error('Error updating password:', error);
      setError(error.response?.data?.message || 'Failed to update password');
      setLoading(false);
    }
  };
  
  const togglePasswordMode = () => {
    setPasswordMode(!passwordMode);
    setError('');
    setSuccess('');
  };
  
  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Avatar
            sx={{ width: 80, height: 80, mr: 3, bgcolor: 'primary.main' }}
          >
            {user.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1">
              My Profile
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your account information
            </Typography>
          </Box>
        </Box>
        
        <Divider sx={{ mb: 4 }} />
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Account Information
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Name" 
                      secondary={user.name} 
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <EmailIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Email" 
                      secondary={user.email} 
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <CalendarTodayIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Account Created" 
                      secondary={new Date(user.createdAt).toLocaleDateString()} 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            {passwordMode ? (
              <form onSubmit={handlePasswordUpdate}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Change Password
                    </Typography>
                    
                    <TextField
                      fullWidth
                      margin="normal"
                      label="Current Password"
                      type="password"
                      name="currentPassword"
                      value={profileData.currentPassword}
                      onChange={handleChange}
                      required
                    />
                    
                    <TextField
                      fullWidth
                      margin="normal"
                      label="New Password"
                      type="password"
                      name="newPassword"
                      value={profileData.newPassword}
                      onChange={handleChange}
                      required
                    />
                    
                    <TextField
                      fullWidth
                      margin="normal"
                      label="Confirm New Password"
                      type="password"
                      name="confirmPassword"
                      value={profileData.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                    
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                      <Button 
                        variant="outlined" 
                        onClick={togglePasswordMode}
                      >
                        Cancel
                      </Button>
                      
                      <Button 
                        type="submit" 
                        variant="contained" 
                        color="primary"
                        startIcon={<SaveIcon />}
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Update Password'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </form>
            ) : (
              <form onSubmit={handleProfileUpdate}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Edit Profile
                    </Typography>
                    
                    <TextField
                      fullWidth
                      margin="normal"
                      label="Name"
                      name="name"
                      value={profileData.name}
                      onChange={handleChange}
                      required
                    />
                    
                    <TextField
                      fullWidth
                      margin="normal"
                      label="Email"
                      type="email"
                      name="email"
                      value={profileData.email}
                      disabled
                      helperText="Email cannot be changed"
                    />
                    
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                      <Button 
                        variant="outlined" 
                        startIcon={<LockIcon />}
                        onClick={togglePasswordMode}
                        sx={{
                          borderColor: '#2c2c2c',
                          color: '#2c2c2c',
                          '&:hover': {
                            backgroundColor: '#f5f5f5',
                            borderColor: '#1a1a1a',
                          },
                        }}
                      >
                        Change Password
                      </Button>
                      
                      <Button 
                        type="submit" 
                        variant="contained" 
                        startIcon={<SaveIcon />}
                        disabled={loading}
                        sx={{
                          backgroundColor: '#2c2c2c',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: '#1a1a1a',
                          },
                        }}
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </form>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default Profile;