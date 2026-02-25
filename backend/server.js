// Load environment variables first so they are available to all subsequent requires
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const mlRoutes = require('./routes/mlRoutes');

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
const analyticsRoutes = require('./routes/analytics.routes');

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/predict', predictionRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/thirdop', thirdopRoutes);
app.use('/api/test', testRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check routes (e.g. Ollama connectivity)
const healthRoutes = require('./routes/health.routes');
app.use('/api/health', healthRoutes);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iga_nephropathy';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// JWT_SECRET required in production; dev fallback for convenience
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is required in production.');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'your_jwt_secret_key';
}

// Server
const PORT = 5009;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('MedGemma backend: Ollama (gemma:7b)');
  console.log('Generic engine (Any Report): Ollama');
});