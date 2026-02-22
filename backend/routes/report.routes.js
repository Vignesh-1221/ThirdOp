const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Report = require('../models/report.model');
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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and image files are allowed.'));
    }
  }
});

// Upload a new report
router.post('/upload', verifyToken, upload.single('reportFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { reportType } = req.body;
    
    const report = new Report({
      user: req.userId,
      reportType,
      reportFile: req.file.path,
      reportData: req.body.reportData || {}
    });
    
    await report.save();

    const fileUrl = `/uploads/${path.basename(report.reportFile)}`;
    const reportObj = {
      ...report.toObject(),
      fileUrl
    };
    
    res.status(201).json({
      message: 'Report uploaded successfully',
      report: reportObj
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new report (manual entry)
router.post('/', verifyToken, async (req, res) => {
  try {
    // Log incoming request body for debugging
    console.log('POST /api/reports - Request body:', JSON.stringify(req.body, null, 2));
    console.log('POST /api/reports - User ID:', req.userId);
    
    const { reportType, source, reportData, predictionResult } = req.body;
    
    // Validate required fields
    if (!reportType) {
      console.error('Validation error: reportType is missing');
      return res.status(400).json({ message: 'reportType is required' });
    }
    
    if (!reportData) {
      console.error('Validation error: reportData is missing');
      return res.status(400).json({ message: 'reportData is required' });
    }
    
    // Validate reportType enum
    const validReportTypes = ['blood', 'urine', 'kidney_biopsy', 'other', 'Manual Entry'];
    if (!validReportTypes.includes(reportType)) {
      console.error('Validation error: Invalid reportType:', reportType);
      return res.status(400).json({ 
        message: `Invalid reportType. Must be one of: ${validReportTypes.join(', ')}` 
      });
    }
    
    // Validate source enum
    const validSources = ['upload', 'manual'];
    const finalSource = source || 'manual';
    if (!validSources.includes(finalSource)) {
      console.error('Validation error: Invalid source:', finalSource);
      return res.status(400).json({ 
        message: `Invalid source. Must be one of: ${validSources.join(', ')}` 
      });
    }
    
    // For manual entries, reportFile is not required (omit it entirely)
    // For upload entries, reportFile should be provided via /upload endpoint
    if (finalSource !== 'manual') {
      // This should not happen for this endpoint, but handle it gracefully
      console.warn('Warning: Non-manual source detected in POST /api/reports endpoint');
      return res.status(400).json({ 
        message: 'File uploads should use POST /api/reports/upload endpoint' 
      });
    }
    
    // Build report object (reportFile is omitted for manual entries)
    const reportDataToSave = {
      user: req.userId,
      reportType,
      source: finalSource,
      reportData: reportData,
      predictionResult: predictionResult || null
    };
    
    console.log('Creating report with data:', JSON.stringify(reportDataToSave, null, 2));
    
    const report = new Report(reportDataToSave);
    
    // Validate the document before saving
    const validationError = report.validateSync();
    if (validationError) {
      console.error('Mongoose validation error:', validationError);
      const errors = {};
      Object.keys(validationError.errors).forEach(key => {
        errors[key] = validationError.errors[key].message;
      });
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errors 
      });
    }
    
    await report.save();
    
    console.log('Report saved successfully with ID:', report._id);
    
    const reportObj = report.toObject();
    // Only add fileUrl if there's an actual file (not manual entries)
    if (report.reportFile && report.source !== 'manual') {
      reportObj.fileUrl = `/uploads/${path.basename(report.reportFile)}`;
    }
    
    res.status(201).json({
      message: 'Report created successfully',
      report: reportObj
    });
  } catch (error) {
    // Enhanced error logging
    console.error('Error in POST /api/reports:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      console.error('Validation errors:', errors);
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errors 
      });
    }
    
    // Handle Mongoose cast errors
    if (error.name === 'CastError') {
      console.error('Cast error:', error);
      return res.status(400).json({ 
        message: 'Invalid data format', 
        error: error.message 
      });
    }
    
    // Generic server error
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// Get all reports for a user
router.get('/', verifyToken, async (req, res) => {
  try {
    const reports = await Report.find({ user: req.userId }).sort({ uploadDate: -1 });

    const normalizedReports = reports.map(report => {
      const reportObj = report.toObject();
      // Only add fileUrl if there's an actual file (not manual entries)
      if (report.reportFile && report.source !== 'manual') {
        reportObj.fileUrl = `/uploads/${path.basename(report.reportFile)}`;
      }
      return reportObj;
    });
    
    res.status(200).json({ reports: normalizedReports });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a specific report
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    // Check if the report belongs to the authenticated user
    if (report.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized access to this report' });
    }
    
    const reportObj = report.toObject();
    // Only add fileUrl if there's an actual file (not manual entries)
    if (report.reportFile && report.source !== 'manual') {
      reportObj.fileUrl = `/uploads/${path.basename(report.reportFile)}`;
    }
    
    res.status(200).json({ report: reportObj });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a specific report
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (report.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized access to this report' });
    }

    // Optionally remove the file from disk
    try {
      if (report.reportFile && fs.existsSync(report.reportFile)) {
        fs.unlinkSync(report.reportFile);
      }
    } catch (e) {
      console.error('Failed to delete report file from disk', e);
    }

    await Report.deleteOne({ _id: report._id });

    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;