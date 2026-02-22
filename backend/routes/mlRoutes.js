const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const path = require('path');
const { spawn } = require('child_process');

// Path to the ML model script in the final folder
const ML_MODEL_PATH = path.join(__dirname, '../../final/model.py');

// POST /api/ml/predict - Run ML prediction on report data
router.post('/predict', auth, async (req, res) => {
  try {
    const { reportId, reportData } = req.body;
    
    if (!reportId || !reportData) {
      return res.status(400).json({ message: 'Report ID and data are required' });
    }
    
    // Run the Python ML model script as a child process
    const pythonProcess = spawn('python', [
      ML_MODEL_PATH,
      JSON.stringify(reportData)
    ]);
    
    let result = '';
    let error = '';
    
    // Collect data from the Python script
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`ML model process exited with code ${code}`);
        console.error(`Error: ${error}`);
        return res.status(500).json({ message: 'Error processing ML prediction', error });
      }
      
      try {
        // Parse the JSON result from the Python script
        const predictionResult = JSON.parse(result);
        return res.json(predictionResult);
      } catch (err) {
        console.error('Error parsing ML model output:', err);
        return res.status(500).json({ message: 'Error parsing ML model output', error: err.message });
      }
    });
    
  } catch (err) {
    console.error('ML prediction error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;