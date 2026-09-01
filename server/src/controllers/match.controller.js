// server/src/controllers/match.controller.js
const prisma = require("../lib/prisma");

const getUserMatches = async (req, res) => {
  const userId = req.user.id;

  try {
    // Find all matches where the user either created the request or offered the resource
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { request: { createdById: userId } },
          { resource: { offeredById: userId } },
        ],
      },
      include: {
        request: true,
        resource: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ matches });
  } catch (error) {
    console.error("[MATCH ERROR]", error);
    return res.status(500).json({ error: "Failed to fetch matches" });
  }
};

const updateMatchStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'accepted', 'rejected', or 'completed'
  const userId = req.user.id;

  if (!["accepted", "rejected", "completed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    // Verify the match exists and the user is involved
    const existingMatch = await prisma.match.findUnique({
      where: { id },
      include: { request: true, resource: true },
    });

    if (!existingMatch) {
      return res.status(404).json({ error: "Match not found" });
    }

    const isRequester = existingMatch.request.createdById === userId;
    const isResponder = existingMatch.resource.offeredById === userId;

    if (!isRequester && !isResponder) {
      return res
        .status(403)
        .json({ error: "Unauthorized to update this match" });
    }

    const updatedMatch = await prisma.match.update({
      where: { id },
      data: { status },
      include: { request: true, resource: true },
    });

    // Notify connected clients about the status change
    const io = req.app.get("io");
    io.emit("match:updated", updatedMatch);

    return res
      .status(200)
      .json({ message: `Match ${status}`, match: updatedMatch });
  } catch (error) {
    console.error("[MATCH UPDATE ERROR]", error);
    return res.status(500).json({ error: "Failed to update match" });
  }
};

module.exports = { getUserMatches, updateMatchStatus };
