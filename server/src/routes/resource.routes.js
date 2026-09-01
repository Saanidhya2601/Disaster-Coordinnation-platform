// server/src/routes/resource.routes.js
const express = require("express");
const router = express.Router();
const {
  createResource,
  getNearbyResources,
} = require("../controllers/resource.controller");
const { requireAuth } = require("../middleware/auth");

router.post("/", requireAuth, createResource);
router.get("/", getNearbyResources);

module.exports = router;
