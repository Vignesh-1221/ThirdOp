const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const mlRoutes = require('./routes/mlRoutes');

// Load environment variables
dotenv.config();

// Verify Gemini API key configuration
console.log("Gemini Key Loaded:", !!process.env.GEMINI_API_KEY);

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Routes
const authRoutes = require('./routes/auth.routes');
const reportRoutes = require('./routes/report.routes');
const doctorRoutes = require('./routes/doctor.routes');
const predictionRoutes = require('./routes/prediction.routes');
const thirdopRoutes = require('./routes/thirdop.routes');
const testRoutes = require('./routes/test.routes');

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/predict', predictionRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/thirdop', thirdopRoutes);
app.use('/api/test', testRoutes);

// MongoDB Connection
const MONGODB_URI = 'mongodb://localhost:27017/iga_nephropathy';

// Use the defined MONGODB_URI constant instead of process.env.MONGODB_URI
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Set JWT_SECRET if not in environment
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'your_jwt_secret_key';
}

// Server
const PORT = 5009;
const NODE_ENV = 'development';

app.listen(PORT, () => {
  console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
});