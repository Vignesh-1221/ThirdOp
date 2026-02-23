const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const path = require('path');
const { spawn } = require('child_process');

// Path to the ML model script in the final folder
const ML_MODEL_PATH = path.join(__dirname, '../../final/model.py');

const ML_TIMEOUT_MS = 30000;

// POST /api/ml/predict - Run ML prediction on report data
router.post('/predict', auth, async (req, res) => {
  let responded = false;
  const sendOnce = (status, body) => {
    if (responded) return;
    responded = true;
    res.status(status).json(body);
  };

  try {
    const { reportId, reportData } = req.body;

    if (!reportId || !reportData) {
      return sendOnce(400, { error: 'INVALID_INPUT', message: 'Report ID and data are required' });
    }

    const pythonProcess = spawn('python', [
      ML_MODEL_PATH,
      JSON.stringify(reportData)
    ]);

    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    const timeout = setTimeout(() => {
      if (responded) return;
      try {
        pythonProcess.kill('SIGKILL');
      } catch (_) { /* ignore */ }
      console.error('ML model timeout');
      sendOnce(503, { error: 'ML_TIMEOUT', message: 'Prediction timed out. Please try again.' });
    }, ML_TIMEOUT_MS);

    pythonProcess.on('close', (code) => {
      clearTimeout(timeout);
      if (responded) return;
      if (code !== 0) {
        console.error(`ML model process exited with code ${code}`, error);
        return sendOnce(500, { error: 'ML_PREDICTION_FAILED', message: 'Error processing ML prediction' });
      }
      try {
        const predictionResult = JSON.parse(result);
        sendOnce(200, predictionResult);
      } catch (err) {
        console.error('Error parsing ML model output:', err);
        sendOnce(500, { error: 'ML_PARSE_ERROR', message: 'Error parsing ML model output' });
      }
    });

    pythonProcess.on('error', (err) => {
      clearTimeout(timeout);
      if (responded) return;
      console.error('ML process spawn error:', err);
      sendOnce(500, { error: 'ML_SPAWN_ERROR', message: 'Could not run prediction' });
    });
  } catch (err) {
    console.error('ML prediction error:', err);
    if (!responded) {
      sendOnce(500, { error: 'SERVER_ERROR', message: 'Server error' });
    }
  }
});

module.exports = router;