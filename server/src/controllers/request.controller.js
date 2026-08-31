// server/src/controllers/request.controller.js
const { Prisma } = require("@prisma/client");
const prisma = require("../lib/prisma");
const { findNearbyRequests } = require("../services/geo.service");

const createRequest = async (req, res) => {
  const {
    category,
    description,
    urgency,
    lat,
    lng,
    peopleAffected,
    quantityNeeded,
  } = req.body;
  const userId = req.user.id; // From auth middleware

  if (!lat || !lng || !category || !description || !urgency) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await prisma.$queryRaw`
      INSERT INTO "requests" (
        "id", "createdById", "category", "description", "urgency", 
        "peopleAffected", "quantityNeeded", "location", "status", "updatedAt"
      ) VALUES (
        gen_random_uuid(), ${userId}, ${category}::"Category", ${description}, ${urgency}::"Urgency", 
        ${peopleAffected || null}, ${quantityNeeded || null}, 
        ST_MakePoint(${lng}, ${lat})::geography, 'open'::"RequestStatus", NOW()
      ) 
      RETURNING id, category, description, urgency, status;
    `;

    return res.status(201).json({
      message: "Request created successfully",
      request: result[0],
    });
  } catch (error) {
    console.error("[REQUEST ERROR]", error);
    return res.status(500).json({ error: "Failed to create request" });
  }
};

const getNearbyRequests = async (req, res) => {
  const { lat, lng, radiusKm = 10, category } = req.query;

  if (!lat || !lng) {
    return res
      .status(400)
      .json({ error: "Latitude and longitude are required" });
  }

  try {
    const requests = await findNearbyRequests(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radiusKm),
      category,
    );

    return res.status(200).json({ requests });
  } catch (error) {
    console.error("[GEO ERROR]", error);
    return res.status(500).json({ error: "Failed to fetch nearby requests" });
  }
};

module.exports = { createRequest, getNearbyRequests };
