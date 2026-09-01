// server/src/controllers/alert.controller.js
const prisma = require("../lib/prisma");

const createAlert = async (req, res) => {
  const { title, description, severity, lat, lng } = req.body;
  const userId = req.user.id;

  if (!title || !description || !severity) {
    return res
      .status(400)
      .json({ error: "Title, description, and severity are required" });
  }

  try {
    let alertData = {
      title,
      description,
      severity,
      createdById: userId,
    };

    // Use Prisma's standard create unless you need radius-based alert queries later
    const newAlert = await prisma.alert.create({ data: alertData });

    // Broadcast emergency alert to all connected clients immediately
    const io = req.app.get("io");
    io.emit("alert:new", newAlert);

    return res
      .status(201)
      .json({ message: "Alert broadcasted", alert: newAlert });
  } catch (error) {
    console.error("[ALERT ERROR]", error);
    return res.status(500).json({ error: "Failed to broadcast alert" });
  }
};

const getActiveAlerts = async (req, res) => {
  try {
    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return res.status(200).json({ alerts });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch alerts" });
  }
};

module.exports = { createAlert, getActiveAlerts };
