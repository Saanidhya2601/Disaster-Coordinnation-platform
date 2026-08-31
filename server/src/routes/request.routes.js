// server/src/routes/request.routes.js
const express = require('express');
const router = express.Router();
const { createRequest, getNearbyRequests } = require('../controllers/request.controller');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, createRequest);
router.get('/', getNearbyRequests); // Public read access for the map

module.exports = router;