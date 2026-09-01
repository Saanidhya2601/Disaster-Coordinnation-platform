// server/src/controllers/checkin.controller.js
const prisma = require("../lib/prisma");

const createCheckIn = async (req, res) => {
  const { status, lat, lng, notes } = req.body;
  const userId = req.user.id;

  if (!status || !lat || !lng) {
    return res
      .status(400)
      .json({ error: "Status, latitude, and longitude are required" });
  }

  try {
    const result = await prisma.$queryRaw`
      INSERT INTO "checkins" (
        "id", "userId", "status", "notes", "location", "createdAt"
      ) VALUES (
        gen_random_uuid(), ${userId}, ${status}, ${notes || null},
        ST_MakePoint(${lng}, ${lat})::geography, NOW()
      ) 
      RETURNING id, status, notes;
    `;

    const newCheckIn = result[0];

    // Broadcast to update live heatmaps
    const io = req.app.get("io");
    io.emit("checkin:new", { ...newCheckIn, lat, lng });

    return res
      .status(201)
      .json({ message: "Check-in successful", checkin: newCheckIn });
  } catch (error) {
    console.error("[CHECKIN ERROR]", error);
    return res.status(500).json({ error: "Failed to record check-in" });
  }
};

module.exports = { createCheckIn };
