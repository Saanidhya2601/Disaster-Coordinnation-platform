// server/src/routes/request.routes.js
const express = require("express");
const router = express.Router();
const {
  createRequest,
  getNearbyRequests,
} = require("../controllers/request.controller");
// const { requireAuth } = require('../middleware/auth'); // Temporarily disabled
const prisma = require("../lib/prisma");

// TEMPORARY BYPASS: Grabs the first seeded user from the database
const mockAuth = async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst();
    if (!user)
      return res
        .status(500)
        .json({ error: "No users found. Run seed script." });
    req.user = { id: user.id };
    next();
  } catch (error) {
    res.status(500).json({ error: "Mock auth failed" });
  }
};

// Use mockAuth instead of requireAuth
router.post("/", mockAuth, createRequest);
router.get("/", getNearbyRequests);

module.exports = router;
