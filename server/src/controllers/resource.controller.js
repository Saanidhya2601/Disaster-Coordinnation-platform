const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  findAndCreateMatchesForResource,
} = require("../services/matching.service");

const createResource = async (req, res) => {
  const { category, description, quantityAvailable, lat, lng } = req.body;
  const userId = req.user.id;

  if (!lat || !lng || !category || !description) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const parsedQty = quantityAvailable ? parseInt(quantityAvailable, 10) : 1;

  try {
    const result = await prisma.$queryRaw`
      INSERT INTO "resources" (
        "id", "offeredById", "category", "description", "quantityAvailable", 
        "location", "status", "updatedAt"
      ) VALUES (
        gen_random_uuid(), 
        ${userId}, 
        ${category}::"Category", 
        ${description}, 
        ${parsedQty}, 
        ST_MakePoint(${parsedLng}::double precision, ${parsedLat}::double precision)::geography, 
        'available'::"ResourceStatus", 
        NOW()
      ) 
      RETURNING id, category, description, "quantityAvailable", status;
    `;

    const newResource = { ...result[0], lat: parsedLat, lng: parsedLng };
    const matches = await findAndCreateMatchesForResource(newResource.id);
    const io = req.app.get("io");

    io.emit("resource:new", newResource);
    if (matches && matches.length > 0) {
      io.emit("match:new", matches);
    }

    return res.status(201).json({
      message: "Resource broadcasted successfully",
      resource: newResource,
      matchesFound: matches ? matches.length : 0,
    });
  } catch (error) {
    console.error("[RESOURCE CREATE ERROR]", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to broadcast resource" });
  }
};

const getNearbyResources = async (req, res) => {
  const { lat = 18.5204, lng = 73.8567, radiusKm = 15 } = req.query;
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const radiusMeters = parseFloat(radiusKm) * 1000;

  try {
    const resources = await prisma.$queryRaw`
      SELECT 
        id, category, description, "quantityAvailable", status, "createdAt",
        ST_Y(location::geometry) AS lat,
        ST_X(location::geometry) AS lng
      FROM "resources"
      WHERE status NOT IN ('depleted'::"ResourceStatus", 'cancelled'::"ResourceStatus")
        AND ST_DWithin(
          location, 
          ST_MakePoint(${parsedLng}::double precision, ${parsedLat}::double precision)::geography, 
          ${radiusMeters}::double precision
        )
      ORDER BY "createdAt" DESC;
    `;

    return res.status(200).json({ resources });
  } catch (error) {
    console.error("[GET RESOURCES ERROR]", error);
    return res.status(500).json({ error: "Failed to fetch nearby resources" });
  }
};

const updateResourceStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'available' | 'depleted' | 'cancelled'

  try {
    await prisma.$executeRaw`
      UPDATE "resources"
      SET status = ${status}::"ResourceStatus", "updatedAt" = NOW()
      WHERE id = ${id};
    `;

    if (status === "depleted" || status === "cancelled") {
      const io = req.app.get("io");
      io.emit("item:resolved", id);
    }

    return res
      .status(200)
      .json({ message: "Resource status updated", id, status });
  } catch (error) {
    console.error("[UPDATE RESOURCE ERROR]", error);
    return res.status(500).json({ error: "Failed to update resource status" });
  }
};

module.exports = { createResource, getNearbyResources, updateResourceStatus };
