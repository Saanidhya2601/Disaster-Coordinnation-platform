// server/src/routes/resource.routes.js
const express = require("express");
const router = express.Router();
const {
  createResource,
  getNearbyResources,
  updateResourceStatus,
} = require("../controllers/resource.controller");
const prisma = require("../lib/prisma");

// TEMPORARY BYPASS
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

router.post("/", mockAuth, createResource);
router.get("/", getNearbyResources);
router.patch("/:id/status", mockAuth, updateResourceStatus);

module.exports = router;
