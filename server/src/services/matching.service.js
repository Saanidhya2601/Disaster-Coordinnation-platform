// server/src/services/matching.service.js
const prisma = require("../lib/prisma");

const findAndCreateMatchesForRequest = async (requestId) => {
  try {
    const matchingResources = await prisma.$queryRaw`
      SELECT rs.id AS "resourceId"
      FROM "resources" rs
      JOIN "requests" rq ON rq.id = ${requestId}
      WHERE rs.status = 'available'
        AND rs.category = rq.category
        AND ST_DWithin(rs.location, rq.location, 10000)
    `;

    if (matchingResources.length === 0) return [];

    const createdMatches = [];
    for (const res of matchingResources) {
      const existing = await prisma.match.findFirst({
        where: { requestId, resourceId: res.resourceId },
      });

      if (!existing) {
        const newMatch = await prisma.match.create({
          data: { requestId, resourceId: res.resourceId, status: "pending" },
        });
        createdMatches.push(newMatch);
      }
    }
    return createdMatches;
  } catch (error) {
    console.error("[MATCHING ERROR]", error);
    throw error;
  }
};

const findAndCreateMatchesForResource = async (resourceId) => {
  try {
    const matchingRequests = await prisma.$queryRaw`
      SELECT rq.id AS "requestId"
      FROM "requests" rq
      JOIN "resources" rs ON rs.id = ${resourceId}
      WHERE rq.status = 'open'
        AND rq.category = rs.category
        AND ST_DWithin(rq.location, rs.location, 10000)
    `;

    if (matchingRequests.length === 0) return [];

    const createdMatches = [];
    for (const req of matchingRequests) {
      const existing = await prisma.match.findFirst({
        where: { requestId: req.requestId, resourceId },
      });

      if (!existing) {
        const newMatch = await prisma.match.create({
          data: { requestId: req.requestId, resourceId, status: "pending" },
        });
        createdMatches.push(newMatch);
      }
    }
    return createdMatches;
  } catch (error) {
    console.error("[MATCHING ERROR]", error);
    throw error;
  }
};

module.exports = {
  findAndCreateMatchesForRequest,
  findAndCreateMatchesForResource,
};
