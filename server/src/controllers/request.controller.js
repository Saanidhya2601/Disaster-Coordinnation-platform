const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  findAndCreateMatchesForRequest,
} = require("../services/matching.service");

const createRequest = async (req, res) => {
  const { category, description, urgency, lat, lng } = req.body;
  const userId = req.user.id;

  if (!lat || !lng || !category || !description) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  try {
    const result = await prisma.$queryRaw`
      INSERT INTO "requests" (
        "id", "createdById", "category", "description", "urgency", 
        "location", "status", "updatedAt"
      ) VALUES (
        gen_random_uuid(), 
        ${userId}, 
        ${category}::"Category", 
        ${description}, 
        ${urgency || "high"}::"Urgency", 
        ST_MakePoint(${parsedLng}::double precision, ${parsedLat}::double precision)::geography, 
        'open'::"RequestStatus", 
        NOW()
      ) 
      RETURNING id, category, description, urgency, status;
    `;

    const newRequest = { ...result[0], lat: parsedLat, lng: parsedLng };
    const matches = await findAndCreateMatchesForRequest(newRequest.id);
    const io = req.app.get("io");

    io.emit("request:new", newRequest);
    if (matches && matches.length > 0) {
      io.emit("match:new", matches);
    }

    return res.status(201).json({
      message: "Request broadcasted successfully",
      request: newRequest,
      matchesFound: matches ? matches.length : 0,
    });
  } catch (error) {
    console.error("[REQUEST CREATE ERROR]", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to broadcast request" });
  }
};

const getNearbyRequests = async (req, res) => {
  const { lat = 18.5204, lng = 73.8567, radiusKm = 15 } = req.query;
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const radiusMeters = parseFloat(radiusKm) * 1000;

  try {
    const requests = await prisma.$queryRaw`
      SELECT 
        id, category, description, urgency, status, "createdAt",
        ST_Y(location::geometry) AS lat,
        ST_X(location::geometry) AS lng
      FROM "requests"
      WHERE status IN ('open'::"RequestStatus", 'matched'::"RequestStatus")
        AND ST_DWithin(
          location, 
          ST_MakePoint(${parsedLng}::double precision, ${parsedLat}::double precision)::geography, 
          ${radiusMeters}::double precision
        )
      ORDER BY "createdAt" DESC;
    `;

    return res.status(200).json({ requests });
  } catch (error) {
    console.error("[GET REQUESTS ERROR]", error);
    return res.status(500).json({ error: "Failed to fetch nearby requests" });
  }
};

const updateRequestStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'open' | 'matched' | 'fulfilled' | 'cancelled'

  try {
    await prisma.$executeRaw`
      UPDATE "requests"
      SET status = ${status}::"RequestStatus", "updatedAt" = NOW()
      WHERE id = ${id};
    `;

    if (status === "fulfilled" || status === "cancelled") {
      const io = req.app.get("io");
      io.emit("item:resolved", id);
    }

    return res
      .status(200)
      .json({ message: "Request status updated", id, status });
  } catch (error) {
    console.error("[UPDATE REQUEST ERROR]", error);
    return res.status(500).json({ error: "Failed to update request status" });
  }
};

module.exports = { createRequest, getNearbyRequests, updateRequestStatus };
