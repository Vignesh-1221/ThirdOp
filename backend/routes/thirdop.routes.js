const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const auth = require('../middleware/auth');
const Report = require('../models/report.model');
const { runThirdOpAnalysis } = require('../services/thirdopController');
const { runGenericAnalysis } = require('../services/genericLabService');
const { generateMedGemmaReasoning } = require('../services/llmService');

const genericUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, `generic-${Date.now()}-${(file.originalname || 'report').replace(/[^a-zA-Z0-9.-]/g, '_')}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname((file.originalname || '').toLowerCase());
    if (ext === '.pdf') return cb(null, true);
    cb(new Error('Only PDF files are allowed for Any Report Analysis.'));
  }
});

/**
 * Core handler for ThirdOp analysis.
 * Used by both the authenticated production route and the test-only route (when NODE_ENV === 'test').
 */
async function handleThirdOpAnalyze(req, res) {
  try {
    const { reportId, reportData, mlPrediction, reportMetadata } = req.body;

    if (!reportId) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Missing required field: reportId'
      });
    }

    if (reportData == null || typeof reportData !== 'object') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Missing required field: reportData (object)'
      });
    }

    const result = await runThirdOpAnalysis({
      reportId,
      reportData,
      mlPrediction: mlPrediction || null,
      reportMetadata: reportMetadata || {}
    });

    // Persist result for re-analysis (so opening report later can show last analysis)
    if (reportId && result && (result.riskTier != null || result.status === 'no_kidney_analysis')) {
      try {
        const toStore = { ...result, version: 1 };
        await Report.findByIdAndUpdate(reportId, { $set: { thirdopAnalysis: toStore } });
      } catch (e) {
        console.warn('[ThirdOp] Could not update report thirdopAnalysis:', e.message);
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('[ThirdOp] Route error:', error.message);
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({
      error: 'THIRDOP_ANALYSIS_FAILED',
      message: 'Error processing ThirdOp analysis. Please try again.',
      ...(isProd ? {} : { details: error.message })
    });
  }
}

/**
 * POST /api/thirdop/analyze
 * Production route: protected by auth middleware.
 */
router.post('/analyze', auth, handleThirdOpAnalyze);

/**
 * POST /api/thirdop/analyze-test
 * Test-only route: bypasses auth middleware.
 * This route is only registered when NODE_ENV === 'test'.
 */
if (process.env.NODE_ENV === 'test') {
  router.post('/analyze-test', handleThirdOpAnalyze);
}

/**
 * POST /api/thirdop/analyze-generic
 * Any Report Analysis: PDF upload → extract params → compare ranges → LLM concerns.
 * Does NOT call ML or analyzeThirdOpCase. Separate engine from kidney flow.
 */
router.post('/analyze-generic', auth, genericUpload.single('file'), async (req, res) => {
  let filePath = null;
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'Invalid input', message: 'PDF file is required.' });
    }
    filePath = req.file.path;
    const gender = req.body.gender || undefined;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated.' });
    }

    const result = await runGenericAnalysis(filePath, gender, userId);

    if (result.status === 'invalid_report') {
      return res.status(200).json({ status: 'invalid_report' });
    }

    if (result.status === 'normal') {
      return res.status(200).json({
        status: 'normal',
        message: result.message || 'No clinically significant abnormalities detected.',
        reportId: result.reportId
      });
    }

    return res.status(200).json({
      status: result.status,
      concerns: result.concerns || [],
      reportId: result.reportId,
      ...(result.partialData && { partialData: true })
    });
  } catch (err) {
    console.error('[ThirdOp] analyze-generic error:', err.message);
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({
      error: 'GENERIC_ANALYSIS_FAILED',
      message: 'Error processing generic lab analysis. Please try again.',
      ...(isProd ? {} : { details: err.message })
    });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
    }
  }
});

/**
 * POST /api/thirdop/medgemma
 * Nephrology-focused clinical reasoning: structured lab JSON → concerns + patient Q&A.
 * Body: { structuredLabInput: Object } (e.g. reportData or canonical lab values).
 */
router.post('/medgemma', auth, async (req, res) => {
  try {
    const { structuredLabInput } = req.body;

    if (structuredLabInput == null || typeof structuredLabInput !== 'object') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Missing or invalid structuredLabInput (must be an object)'
      });
    }

    const result = await generateMedGemmaReasoning(structuredLabInput);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[ThirdOp] medgemma error:', err.message);
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({
      error: 'MEDGEMMA_REASONING_FAILED',
      message: 'Clinical reasoning request failed. Please try again.',
      ...(isProd ? {} : { details: err.message })
    });
  }
});

module.exports = router;
