const mongoose = require('mongoose');
const User = require('../models/user.model');
const Doctor = require('../models/doctor.model');

// MongoDB Connection
const MONGODB_URI = 'mongodb://localhost:27017/iga_nephropathy';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const seedDoctors = async () => {
  try {
    // Clear existing doctors
    await Doctor.deleteMany({});
    
    // Create doctor users
    const doctorUsers = [
      {
        name: 'Kamal Kiran',
        email: 'kamal.kiran@medicoverhospitals.in',
        password: 'password123',
        role: 'doctor'
      },
      {
        name: 'Dr. Ravi Shankar B',
        email: 'ravi.shankar@medicoverhospitals.in',
        password: 'password123',
        role: 'doctor'
      },
      {
        name: 'Dr. Arun Kumar Donakonda',
        email: 'arun.donakonda@medicoverhospitals.in',
        password: 'password123',
        role: 'doctor'
      },
      {
        name: 'Dr. V Srinivas',
        email: 'v.srinivas@medicoverhospitals.in',
        password: 'password123',
        role: 'doctor'
      },
      {
        name: 'Dr. P. Sri Ram Naveen',
        email: 'sri.ram.naveen@medicoverhospitals.in',
        password: 'password123',
        role: 'doctor'
      },
      {
        name: 'Dr. Bhaskara Rao Beesetty',
        email: 'bhaskara.rao@medicoverhospitals.in',
        password: 'password123',
        role: 'doctor'
      },
      {
        name: 'Dr. Sanjay Maitra',
        email: 'sanjay.maitra@apollohospitals.com',
        password: 'password123',
        role: 'doctor'
      },
      {
        name: 'Dr. Haresh Dodeja',
        email: 'haresh.dodeja@fortishospitals.in',
        password: 'password123',
        role: 'doctor'
      },
      {
        name: 'Dr. Shyam Bihari Bansal',
        email: 'shyam.bansal@medanta.org',
        password: 'password123',
        role: 'doctor'
      },
      {
        name: 'Dr. Jayant Kumar Hota',
        email: 'jayant.hota@apollohospitals.com',
        password: 'password123',
        role: 'doctor'
      }
    ];
    
    for (const doctorData of doctorUsers) {
      // Check if user already exists
      let user = await User.findOne({ email: doctorData.email });
      
      if (!user) {
        user = new User(doctorData);
        await user.save();
      }
      
      // Create doctor profile
      const doctor = new Doctor({
        user: user._id,
        specialization: 'Nephrology',
        hospital: 'City General Hospital',
        experience: Math.floor(Math.random() * 15) + 5, // 5-20 years experience
        consultationFee: Math.floor(Math.random() * 100) + 100, // $100-200 fee
        bio: `Experienced nephrologist specializing in IgA Nephropathy and other kidney disorders.`,
        availability: [
          {
            day: 'Monday',
            slots: [
              { startTime: '09:00 AM', endTime: '10:00 AM', isBooked: false },
              { startTime: '10:00 AM', endTime: '11:00 AM', isBooked: false },
              { startTime: '11:00 AM', endTime: '12:00 PM', isBooked: false }
            ]
          },
          {
            day: 'Wednesday',
            slots: [
              { startTime: '01:00 PM', endTime: '02:00 PM', isBooked: false },
              { startTime: '02:00 PM', endTime: '03:00 PM', isBooked: false },
              { startTime: '03:00 PM', endTime: '04:00 PM', isBooked: false }
            ]
          },
          {
            day: 'Friday',
            slots: [
              { startTime: '09:00 AM', endTime: '10:00 AM', isBooked: false },
              { startTime: '10:00 AM', endTime: '11:00 AM', isBooked: false },
              { startTime: '11:00 AM', endTime: '12:00 PM', isBooked: false }
            ]
          }
        ]
      });
      
      await doctor.save();
      console.log(`Created doctor: ${user.name}`);
    }
    
    console.log('Doctors seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding doctors:', error);
    process.exit(1);
  }
};

seedDoctors();