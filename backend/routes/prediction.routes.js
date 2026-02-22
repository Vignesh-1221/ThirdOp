const express = require('express');
const router = express.Router();
const Report = require('../models/report.model');
const jwt = require('jsonwebtoken');
const axios = require('axios');

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

// Send report to Flask for ML prediction
router.post('/', verifyToken, async (req, res) => {
  try {
    const { reportId } = req.body;

    // 1. Find the report
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // 2. Verify user
    if (report.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized access to this report' });
    }

    // 3. Prepare report data for Flask model
    const reportData = {
      CREATININE: report.CREATININE,
      UREA: report.UREA,
      ALBUMIN: report.ALBUMIN,
      URIC_ACID: report.URIC_ACID,
      eGFR: report.eGFR,
      ACR: report.ACR
    };

    // 4. Send report data to Flask backend
    const flaskResponse = await axios.post('http://localhost:5000/predict', reportData);

    // 5. Save the prediction result to the report
    report.predictionResult = {
      ...flaskResponse.data,
      timestamp: new Date()
    };
    await report.save();

    // 6. Return the result
    res.status(200).json({
      message: 'Prediction completed successfully',
      predictionResult: flaskResponse.data
    });

  } catch (error) {
    console.error('Prediction route error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;