/**
 * Health check routes (e.g. Ollama connectivity for MedGemma).
 * GET /api/health/ollama — runs Python medgemma_service with a small test input;
 * returns { status: "connected", model } on success, { status: "error", message } on failure.
 */

const express = require('express');
const router = express.Router();
const { generateMedGemmaReasoningViaOllama } = require('../services/ollamaMedGemmaBridge');

/** Minimal test input for Ollama health check (single lab value to keep response small) */
const OLLAMA_HEALTH_TEST_INPUT = { CREATININE: 1.0 };

/**
 * GET /api/health/ollama
 * Calls the Python medgemma_service with a small test input to verify Ollama (gemma:7b) is reachable.
 * Success: { status: "connected", model: process.env.OLLAMA_MEDGEMMA_MODEL }
 * Failure: { status: "error", message: error.message }
 */
router.get('/ollama', async (req, res) => {
  try {
    await generateMedGemmaReasoningViaOllama(OLLAMA_HEALTH_TEST_INPUT);
    return res.status(200).json({
      status: 'connected',
      model: process.env.OLLAMA_MEDGEMMA_MODEL || 'gemma:7b'
    });
  } catch (err) {
    console.error('[Health] Ollama check failed:', err.message);
    return res.status(200).json({
      status: 'error',
      message: err.message
    });
  }
});

module.exports = router;
