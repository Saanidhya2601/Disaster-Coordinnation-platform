// server/src/routes/alert.routes.js
const express = require("express");
const router = express.Router();
const {
  createAlert,
  getActiveAlerts,
} = require("../controllers/alert.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

// Only allow Admins or Dispatchers to create system-wide alerts
router.post(
  "/",
  requireAuth,
  requireRole(["ADMIN", "DISPATCHER"]),
  createAlert,
);
router.get("/", getActiveAlerts);

module.exports = router;
