const express = require('express');
const router = express.Router();

/**
 * GET /api/test/list-models
 * Backend uses Ollama only; no cloud model list.
 */
router.get('/list-models', async (req, res) => {
  return res.status(200).json({
    message: 'Backend uses Ollama only. No cloud API.',
    ollama: true
  });
});

module.exports = router;
