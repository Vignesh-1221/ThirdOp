const express = require('express');
const router = express.Router();
const Doctor = require('../models/doctor.model');
const Appointment = require('../models/appointment.model');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all appointments for a patient - KEEP THIS ONE, REMOVE THE DUPLICATE BELOW
router.get('/appointments', verifyToken, async (req, res) => {
  try {
    // Find appointments for the user
    const appointments = await Appointment.find({ patient: req.userId })
      .populate({
        path: 'doctor',
        populate: {
          path: 'user',
          select: 'name email'
        }
      })
      .sort({ appointmentDate: 1 });
    
    res.status(200).json({ appointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all doctors
router.get('/', async (req, res) => {
  try {
    const doctors = await Doctor.find().populate('user', 'name email');
    
    // Add this for debugging
    console.log(`Found ${doctors.length} doctors`);
    
    res.status(200).json({ doctors });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a specific doctor
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate('user', 'name email');
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.status(200).json({ doctor });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Book an appointment with a doctor
router.post('/book', verifyToken, async (req, res) => {
  try {
    const { doctorId, appointmentDate, timeSlot, notes } = req.body;
    
    // Log the request data for debugging
    console.log('Booking request:', { doctorId, appointmentDate, timeSlot, notes });
    
    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Parse the appointment date
    const appointmentDay = new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'long' });
    console.log('Appointment day:', appointmentDay);
    
    // Find the availability for the selected day
    const availabilityForDay = doctor.availability.find(a => a.day === appointmentDay);
    console.log('Availability for day:', availabilityForDay);
    
    if (!availabilityForDay) {
      return res.status(400).json({ message: 'Doctor is not available on this day' });
    }
    
    // Find the selected time slot - make sure to trim whitespace for comparison
    const selectedSlot = availabilityForDay.slots.find(
      s => s.startTime.trim() === timeSlot.startTime.trim() && 
           s.endTime.trim() === timeSlot.endTime.trim()
    );
    
    console.log('Selected slot:', selectedSlot);
    console.log('Available slots:', availabilityForDay.slots);
    
    if (!selectedSlot) {
      return res.status(400).json({ 
        message: 'Selected time slot not found',
        requestedSlot: timeSlot,
        availableSlots: availabilityForDay.slots
      });
    }
    
    if (selectedSlot.isBooked) {
      return res.status(400).json({ message: 'This time slot is already booked' });
    }
    
    // Create new appointment
    const appointment = new Appointment({
      patient: req.userId,
      doctor: doctorId,
      appointmentDate: new Date(appointmentDate),
      timeSlot,
      notes,
      status: 'scheduled'
    });
    
    await appointment.save();
    
    // Update doctor's availability
    selectedSlot.isBooked = true;
    await doctor.save();
    
    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// REMOVE THIS DUPLICATE ROUTE
// Get all appointments for a patient
// Add or fix the appointments endpoint
// router.get('/appointments', async (req, res) => {
//   try {
//     // Check if user is authenticated
//     if (!req.userId) {
//       return res.status(401).json({ message: 'Authentication required' });
//     }
//     
//     // Find appointments for the user
//     const appointments = await Appointment.find({ patient: req.userId })
//       .populate({
//         path: 'doctor',
//         populate: {
//           path: 'user',
//           select: 'name email'
//         }
//       })
//       .sort({ appointmentDate: 1 });
//     
//     res.status(200).json({ appointments });
//   } catch (error) {
//     console.error('Error fetching appointments:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// Cancel an appointment
router.put('/appointments/:id/cancel', verifyToken, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    
    // Find the appointment
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Check if the user is authorized to cancel this appointment
    if (appointment.patient.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to cancel this appointment' });
    }
    
    // Update appointment status
    appointment.status = 'cancelled';
    await appointment.save();
    
    // If the appointment has a doctor and time slot, update the doctor's availability
    if (appointment.doctor) {
      const doctor = await Doctor.findById(appointment.doctor);
      if (doctor) {
        const appointmentDay = new Date(appointment.appointmentDate).toLocaleDateString('en-US', { weekday: 'long' });
        const availabilityIndex = doctor.availability.findIndex(a => a.day === appointmentDay);
        
        if (availabilityIndex !== -1) {
          const slotIndex = doctor.availability[availabilityIndex].slots.findIndex(
            s => s.startTime === appointment.timeSlot.startTime && s.endTime === appointment.timeSlot.endTime
          );
          
          if (slotIndex !== -1) {
            doctor.availability[availabilityIndex].slots[slotIndex].isBooked = false;
            await doctor.save();
          }
        }
      }
    }
    
    res.status(200).json({ 
      message: 'Appointment cancelled successfully',
      appointment
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;