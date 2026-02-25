const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getAnalyticsForUser } = require('../controllers/analytics.controller');

router.get('/', auth, getAnalyticsForUser);

module.exports = router;

