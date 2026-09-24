// server/src/routes/alert.routes.js
const express = require("express");
const router = express.Router();
const {
  createAlert,
  getActiveAlerts,
} = require("../controllers/alert.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/", requireAuth, getActiveAlerts);

router.post(
  "/",
  requireAuth,
  requireRole(["admin", "coordinator"]),
  createAlert,
);

module.exports = router;
