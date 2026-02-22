import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
// Update the imports to include dayjs
// If you're not using dayjs directly in this file, remove it from imports
// import dayjs from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [specialization, setSpecialization] = useState('');
  
  // Appointment booking state
  const [openBooking, setOpenBooking] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/doctors');
        setDoctors(response.data.doctors);
        setFilteredDoctors(response.data.doctors);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching doctors:', error);
        setError('Failed to load doctors. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchDoctors();
  }, []);
  
  useEffect(() => {
    // Filter doctors based on search term and specialization
    const filtered = doctors.filter((doctor) => {
      const matchesSearch = doctor.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doctor.hospital.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSpecialization = specialization ? doctor.specialization === specialization : true;
      
      return matchesSearch && matchesSpecialization;
    });
    
    setFilteredDoctors(filtered);
  }, [searchTerm, specialization, doctors]);
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const handleSpecializationChange = (e) => {
    setSpecialization(e.target.value);
  };
  
  const handleOpenBooking = (doctor) => {
    setSelectedDoctor(doctor);
    setOpenBooking(true);
    setBookingSuccess(false);
    setBookingError('');
  };
  
  const handleCloseBooking = () => {
    setOpenBooking(false);
    setSelectedDoctor(null);
    setAppointmentDate(null);
    setSelectedTimeSlot('');
    setNotes('');
    setBookingError('');
  };
  
  const handleBookAppointment = async () => {
    // Validate form
    if (!appointmentDate || !selectedTimeSlot) {
      setBookingError('Please select both date and time slot');
      return;
    }
    
    try {
      setBookingLoading(true);
      setBookingError('');
      
      // Fix the timeSlot format and ensure appointmentDate is properly formatted
      const [startTime, endTime] = selectedTimeSlot.split('-').map(time => time.trim());
      
      await axios.post('/api/doctors/book', {
        doctorId: selectedDoctor._id,
        appointmentDate: appointmentDate.toISOString(),
        timeSlot: {
          startTime,
          endTime
        },
        notes
      });
      
      setBookingSuccess(true);
      setBookingLoading(false);
      
      // Close dialog after a delay
      setTimeout(() => {
        handleCloseBooking();
      }, 2000);
    } catch (error) {
      console.error('Error booking appointment:', error);
      setBookingError(error.response?.data?.message || 'Failed to book appointment. Please try again.');
      setBookingLoading(false);
    }
  };
  
  // Get available time slots for the selected doctor and date
  const getAvailableTimeSlots = () => {
    if (!selectedDoctor || !appointmentDate) return [];
    
    // Use dayjs format method instead of toLocaleDateString
    const dayOfWeek = appointmentDate.format('dddd'); // 'dddd' gives the full day name (Monday, Tuesday, etc.)
    console.log('Day of week:', dayOfWeek);
    
    // Check if the doctor has availability for this day
    const availability = selectedDoctor.availability.find(a => a.day === dayOfWeek);
    
    // If no specific availability for this day, provide default slots
    if (!availability) {
      // Default time slots for all days
      return [
        '09:00 AM - 10:00 AM',
        '10:00 AM - 11:00 AM',
        '11:00 AM - 12:00 PM',
        '01:00 PM - 02:00 PM',
        '02:00 PM - 03:00 PM',
        '03:00 PM - 04:00 PM'
      ];
    }
    
    // If there is specific availability, use it
    return availability.slots
      .filter(slot => !slot.isBooked)
      .map(slot => `${slot.startTime} - ${slot.endTime}`);
  };
  
  // Get unique specializations for filter
  const specializations = [...new Set(doctors.map(doctor => doctor.specialization))];
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Find a Nephrologist
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Search and Filter */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            placeholder="Search by name, specialization, or hospital"
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel id="specialization-label">
              <FilterListIcon sx={{ mr: 1 }} />
              Filter by Specialization
            </InputLabel>
            <Select
              labelId="specialization-label"
              value={specialization}
              label="Filter by Specialization"
              onChange={handleSpecializationChange}
            >
              <MenuItem value="">All Specializations</MenuItem>
              {specializations.map((spec) => (
                <MenuItem key={spec} value={spec}>{spec}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      {/* Doctors List */}
      {filteredDoctors.length > 0 ? (
        <Grid container spacing={3}>
          {filteredDoctors.map((doctor) => (
            <Grid item xs={12} md={6} lg={4} key={doctor._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      sx={{ width: 56, height: 56, mr: 2, bgcolor: '#2c2c2c', color: 'white' }}
                    >
                      {doctor.user.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" component="div" sx={{ color: '#2c2c2c' }}>
                        Dr. {doctor.user.name}
                      </Typography>
                      <Chip 
                        label={doctor.specialization} 
                        size="small" 
                        sx={{ backgroundColor: '#2c2c2c', color: 'white', mr: 1 }} 
                      />
                      <Chip 
                        label={`${doctor.experience} years exp.`} 
                        size="small" 
                        variant="outlined" 
                        sx={{ borderColor: '#2c2c2c', color: '#2c2c2c' }}
                      />
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    <strong>Hospital:</strong> {doctor.hospital}
                  </Typography>
                  
                  {doctor.bio && (
                    <Typography variant="body2" paragraph sx={{ color: '#2c2c2c' }}>
                      {doctor.bio}
                    </Typography>
                  )}
                  
                  <Typography variant="body2" color="text.secondary">
                    <strong>Consultation Fee:</strong> ${doctor.consultationFee}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    fullWidth 
                    variant="contained"
                    startIcon={<LocalHospitalIcon />}
                    onClick={() => handleOpenBooking(doctor)}
                    sx={{
                      backgroundColor: '#2c2c2c',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#1a1a1a',
                      },
                    }}
                  >
                    Book Appointment
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No doctors found matching your criteria.
          </Typography>
        </Box>
      )}
      
      {/* Appointment Booking Dialog */}
      <Dialog open={openBooking} onClose={handleCloseBooking} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedDoctor && `Book Appointment with Dr. ${selectedDoctor.user.name}`}
        </DialogTitle>
        <DialogContent>
          {bookingSuccess ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              Appointment booked successfully!
            </Alert>
          ) : (
            <>
              {bookingError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {bookingError}
                </Alert>
              )}
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  {/* DatePicker component */}
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Appointment Date"
                      value={appointmentDate}
                      onChange={(newValue) => setAppointmentDate(newValue)}
                      slotProps={{ textField: { fullWidth: true } }}
                      disablePast
                    />
                  </LocalizationProvider>
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth disabled={!appointmentDate}>
                    <InputLabel id="time-slot-label">Select Time Slot</InputLabel>
                    <Select
                      labelId="time-slot-label"
                      value={selectedTimeSlot}
                      label="Select Time Slot"
                      onChange={(e) => setSelectedTimeSlot(e.target.value)}
                    >
                      {getAvailableTimeSlots().map((slot) => (
                        <MenuItem key={slot} value={slot}>
                          {slot}
                        </MenuItem>
                      ))}
                    </Select>
                    {appointmentDate && getAvailableTimeSlots().length === 0 && (
                      <FormHelperText error>
                        No available slots for this date. Please select another date.
                      </FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes (Optional)"
                    multiline
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe your symptoms or reason for visit"
                  />
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBooking}>
            {bookingSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!bookingSuccess && (
            <Button 
              variant="contained" 
              onClick={handleBookAppointment}
              disabled={!appointmentDate || !selectedTimeSlot || bookingLoading}
              startIcon={bookingLoading && <CircularProgress size={20} />}
            >
              {bookingLoading ? 'Booking...' : 'Book Appointment'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Doctors;