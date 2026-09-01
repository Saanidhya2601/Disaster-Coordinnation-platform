// server/src/controllers/resource.controller.js
const { Prisma } = require("@prisma/client");
const prisma = require("../lib/prisma");
const { findNearbyResources } = require("../services/geo.service");
const {
  findAndCreateMatchesForResource,
} = require("../services/matching.service");

const createResource = async (req, res) => {
  const { category, description, lat, lng, quantityAvailable } = req.body;
  const userId = req.user.id;

  if (!lat || !lng || !category || !description) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await prisma.$queryRaw`
      INSERT INTO "resources" (
        "id", "offeredById", "category", "description", "quantityAvailable", 
        "location", "status", "updatedAt"
      ) VALUES (
        gen_random_uuid(), ${userId}, ${category}::"Category", ${description}, 
        ${quantityAvailable || null}, ST_MakePoint(${lng}, ${lat})::geography, 
        'available'::"ResourceStatus", NOW()
      ) 
      RETURNING id, category, description, status;
    `;

    const newResource = result[0];

    // 1. Run Automated Matching
    const matches = await findAndCreateMatchesForResource(newResource.id);

    // 2. Broadcast via Socket.io
    const io = req.app.get("io");
    io.emit("resource:new", {
      ...newResource,
      lat,
      lng,
    });

    if (matches.length > 0) {
      io.emit("match:new", matches);
    }

    return res.status(201).json({
      message: "Resource posted",
      resource: newResource,
      matchesFound: matches.length,
    });
  } catch (error) {
    console.error("[RESOURCE ERROR]", error);
    return res.status(500).json({ error: "Failed to create resource" });
  }
};

const getNearbyResources = async (req, res) => {
  const { lat, lng, radiusKm = 10, category } = req.query;

  if (!lat || !lng) {
    return res
      .status(400)
      .json({ error: "Latitude and longitude are required" });
  }

  try {
    const resources = await findNearbyResources(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radiusKm),
      category,
    );
    return res.status(200).json({ resources });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch resources" });
  }
};

module.exports = { createResource, getNearbyResources };
