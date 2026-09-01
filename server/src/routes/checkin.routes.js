// server/src/routes/checkin.routes.js
const express = require("express");
const router = express.Router();
const { createCheckIn } = require("../controllers/checkin.controller");
const { requireAuth } = require("../middleware/auth");

router.post("/", requireAuth, createCheckIn);

module.exports = router;
