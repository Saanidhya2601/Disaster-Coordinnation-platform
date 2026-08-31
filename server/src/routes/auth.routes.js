// server/src/routes/auth.routes.js
const express = require("express");
const router = express.Router();
const { sendOtp, verifyOtp, getMe } = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");

router.post("/otp/send", authLimiter, sendOtp);
router.post("/otp/verify", authLimiter, verifyOtp);
router.get("/me", requireAuth, getMe);

module.exports = router;
