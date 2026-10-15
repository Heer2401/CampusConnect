/**
 * Dhrumil Doshi (202512088) — Authentication & User Management Lead
 * sustainabilityRoutes.js
 * 
 * Endpoints:
 * GET /api/sustainability/me — Get personal sustainability dashboard metrics (FR-1.8)
 */

const express = require('express');
const { getMySustainability } = require('../controllers/sustainabilityController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/me', getMySustainability);

module.exports = router;
