// server/src/routes/match.routes.js
const express = require("express");
const router = express.Router();
const {
  getUserMatches,
  updateMatchStatus,
} = require("../controllers/match.controller");
const { requireAuth } = require("../middleware/auth");

router.get("/", requireAuth, getUserMatches);
router.patch("/:id/status", requireAuth, updateMatchStatus);

module.exports = router;
