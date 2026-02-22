const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { generateDifferentialAnalysis } = require('../services/differentialService');

/**
 * Normalize reportData to canonical keys (same as previous route).
 */
function normalizeReportData(raw) {
  return {
    'CREATININE (mg/dL)': raw['CREATININE (mg/dL)'] ?? raw.CREATININE ?? raw.creatinine ?? null,
    'UREA (mg/dL)': raw['UREA (mg/dL)'] ?? raw.UREA ?? raw.urea ?? null,
    'ALBUMIN (g/dL)': raw['ALBUMIN (g/dL)'] ?? raw.ALBUMIN ?? raw.albumin ?? null,
    'URIC ACID (mg/dL)': raw['URIC ACID (mg/dL)'] ?? raw.URIC_ACID ?? raw.uric_acid ?? null,
    eGFR: raw.eGFR ?? raw.EGFR ?? null,
    ACR: raw.ACR ?? raw.acr ?? null
  };
}

/**
 * POST /api/thirdop/analyze
 * Analyzes clinical data and ML prediction; returns decision support.
 * Flow: cache → LLM differential → on failure rule fallback. Never crashes on Gemini 429/failure.
 */
router.post('/analyze', auth, async (req, res) => {
  try {
    const { reportId, reportData, mlPrediction, reportMetadata } = req.body;

    if (!reportId) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Missing required field: reportId'
      });
    }

    if (!reportData) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Missing required field: reportData'
      });
    }

    if (!mlPrediction) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Missing required field: mlPrediction'
      });
    }

    const normalizedReportData = normalizeReportData(reportData);

    const hasCreatinine = normalizedReportData['CREATININE (mg/dL)'] != null;
    const hasUrea = normalizedReportData['UREA (mg/dL)'] != null;
    const hasAlbumin = normalizedReportData['ALBUMIN (g/dL)'] != null;
    if (!hasCreatinine || !hasUrea || !hasAlbumin) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Missing required clinical values (creatinine, urea, albumin)'
      });
    }

    if (mlPrediction.status !== 'success') {
      return res.status(400).json({
        error: 'ML prediction error',
        message: 'ML prediction status is not success. Cannot proceed with analysis.',
        details: { status: mlPrediction.status, error: mlPrediction.error || 'Unknown error' }
      });
    }

    if (mlPrediction.prediction === null || mlPrediction.prediction === undefined) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Missing required field: mlPrediction.prediction'
      });
    }

    if (!Array.isArray(mlPrediction.probabilities) || mlPrediction.probabilities.length !== 2) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'mlPrediction.probabilities must be an array of length 2'
      });
    }

    const result = await generateDifferentialAnalysis(
      reportId,
      normalizedReportData,
      mlPrediction,
      reportMetadata || {}
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('[ThirdOp] Route error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error processing ThirdOp analysis',
      details: error.message
    });
  }
});

module.exports = router;
