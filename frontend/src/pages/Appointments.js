import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tab,
  Tabs
} from '@mui/material';
import dayjs from 'dayjs';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  // Cancel appointment state
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);

        // Retrieve the token from localStorage
        const token = localStorage.getItem('token');
        console.log('Token:', token);

        if (!token) {
          setError('Authentication token is missing. Please log in again.');
          setLoading(false);
          return;
        }

        // Include the token in the Authorization header
        const response = await axios.get('/api/doctors/appointments', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setAppointments(response.data.appointments);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching appointments:', error);
        setError('Failed to load appointments. Please try again later.');
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleOpenCancelDialog = (appointment) => {
    setSelectedAppointment(appointment);
    setOpenCancelDialog(true);
  };
  
  const handleCloseCancelDialog = () => {
    setOpenCancelDialog(false);
    setSelectedAppointment(null);
    setCancelReason('');
  };
  
  const handleCancelAppointment = async () => {
    try {
      setCancelLoading(true);
      
      // Change from POST to PUT to match the backend route
      await axios.put(`/api/doctors/appointments/${selectedAppointment._id}/cancel`, {
        reason: cancelReason
      });
      
      // Update the appointment status locally
      setAppointments(appointments.map(appointment => 
        appointment._id === selectedAppointment._id 
          ? { ...appointment, status: 'cancelled' } 
          : appointment
      ));
      
      setCancelLoading(false);
      handleCloseCancelDialog();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      setError('Failed to cancel appointment. Please try again.');
      setCancelLoading(false);
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'primary';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return <EventIcon />;
      case 'completed':
        return <CheckCircleIcon />;
      case 'cancelled':
        return <CancelIcon />;
      default:
        return null;
    }
  };
  
  const filteredAppointments = appointments.filter(appointment => {
    if (tabValue === 0) return true; // All appointments
    if (tabValue === 1) return appointment.status === 'scheduled';
    if (tabValue === 2) return appointment.status === 'completed';
    if (tabValue === 3) return appointment.status === 'cancelled';
    return true;
  });
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container 
  maxWidth="lg" 
  sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', mt: 4, mb: 4 }}>

      <Typography variant="h4" component="h1" gutterBottom>
        My Appointments
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="All" />
          <Tab label="Upcoming" />
          <Tab label="Completed" />
          <Tab label="Cancelled" />
        </Tabs>
      </Paper>
      
      {filteredAppointments.length > 0 ? (
        <Grid container spacing={3}>
          {filteredAppointments.map((appointment) => (
            <Grid item xs={12} key={appointment._id}>
              <Paper sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={8}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <LocalHospitalIcon sx={{ mr: 1, color: '#2c2c2c' }} />
                      <Typography variant="h6">
                        Dr. {appointment.doctor.user.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {appointment.doctor.specialization} • {appointment.doctor.hospital}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                      <EventIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {dayjs(appointment.appointmentDate).format('dddd, MMMM D, YYYY')}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <AccessTimeIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {appointment.timeSlot.startTime} - {appointment.timeSlot.endTime}
                      </Typography>
                    </Box>
                    
                    {appointment.notes && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Notes:
                        </Typography>
                        <Typography variant="body2">
                          {appointment.notes}
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <Chip 
                        icon={getStatusIcon(appointment.status)}
                        label={appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)} 
                        color={getStatusColor(appointment.status)} 
                        sx={{ mb: 2 }}
                      />
                      
                      {appointment.status === 'scheduled' && (
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<CancelIcon />}
                          onClick={() => handleOpenCancelDialog(appointment)}
                        >
                          Cancel
                        </Button>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No appointments found
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {tabValue === 0 
              ? "You don't have any appointments yet." 
              : tabValue === 1 
                ? "You don't have any upcoming appointments." 
                : tabValue === 2 
                  ? "You don't have any completed appointments." 
                  : "You don't have any cancelled appointments."}
          </Typography>
          <Button 
            variant="contained" 
            component="a" 
            href="/doctors"
            startIcon={<LocalHospitalIcon />}
          >
            Find a Doctor
          </Button>
        </Paper>
      )}
      
      {/* Cancel Appointment Dialog */}
      <Dialog open={openCancelDialog} onClose={handleCloseCancelDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Appointment</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Are you sure you want to cancel your appointment with Dr. {selectedAppointment?.doctor.user.name} on {selectedAppointment && dayjs(selectedAppointment.appointmentDate).format('MMMM D, YYYY')} at {selectedAppointment?.timeSlot.startTime}?
          </Typography>
          
          <TextField
            fullWidth
            label="Reason for cancellation (Optional)"
            multiline
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelDialog}>
            No, Keep Appointment
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleCancelAppointment}
            disabled={cancelLoading}
            startIcon={cancelLoading && <CircularProgress size={20} />}
          >
            {cancelLoading ? 'Cancelling...' : 'Yes, Cancel Appointment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Appointments;