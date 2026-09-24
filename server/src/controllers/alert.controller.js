// server/src/controllers/alert.controller.js
const prisma = require("../lib/prisma");

const createAlert = async (req, res) => {
  const { title, body, severity, expiresAt } = req.body;
  const userId = req.user.id;

  try {
    const newAlert = await prisma.alert.create({
      data: {
        title,
        body,
        severity: severity || "info",
        createdById: userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    // Instantly push the alert to all connected screens
    req.app.get("io").emit("alert:new", newAlert);

    return res.status(201).json(newAlert);
  } catch (error) {
    console.error("[ALERT ERROR]", error);
    return res.status(500).json({ error: "Failed to create alert" });
  }
};

const getActiveAlerts = async (req, res) => {
  try {
    const alerts = await prisma.alert.findMany({
      where: {
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ alerts });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch alerts" });
  }
};

module.exports = { createAlert, getActiveAlerts };
