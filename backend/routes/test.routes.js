const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * GET /api/test/list-models
 * Temporary route to list available Gemini models
 */
router.get('/list-models', async (req, res) => {
  try {
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({
        error: 'Gemini API key not configured'
      });
    }

    // Call Gemini API to list models
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await axios.get(apiUrl, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Return the full JSON response
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('[Test] Error listing models:', error.message);
    if (error.response) {
      return res.status(error.response.status || 500).json({
        error: 'Failed to list models',
        details: error.response.data
      });
    }
    return res.status(500).json({
      error: 'Failed to list models',
      message: error.message
    });
  }
});

module.exports = router;
