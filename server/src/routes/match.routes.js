// server/src/routes/match.routes.js
const express = require("express");
const router = express.Router();
const {
  getUserMatches,
  updateMatchStatus,
} = require("../controllers/match.controller");
const prisma = require("../lib/prisma");

// TEMPORARY BYPASS (Until we build the real JWT Auth next)
const mockAuth = async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst();
    if (!user) return res.status(500).json({ error: "No users found." });

    req.user = { id: user.id };
    next();
  } catch (error) {
    res.status(500).json({ error: "Auth failed" });
  }
};

// Replaced requireAuth with mockAuth to prevent immediate 401 Unauthorized crashes
router.get("/", mockAuth, getUserMatches);
router.patch("/:id/status", mockAuth, updateMatchStatus);

module.exports = router;
