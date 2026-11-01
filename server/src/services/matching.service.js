const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const findAndCreateMatchesForRequest = async (requestId) => {
  try {
    const nearbyResources = await prisma.$queryRaw`
      SELECT r.id AS "resourceId"
      FROM "resources" r
      JOIN "requests" req ON req.id = ${requestId}
      WHERE r.category = req.category
        AND r.status = 'available'::"ResourceStatus"
        AND ST_DWithin(r.location, req.location, 10000); -- 10km radius
    `;

    const createdMatches = [];
    for (const res of nearbyResources) {
      const match = await prisma.match.create({
        data: {
          requestId,
          resourceId: res.resourceId,
          status: "proposed",
        },
      });
      createdMatches.push(match);
    }
    return createdMatches;
  } catch (err) {
    console.error("[MATCHING SERVICE ERROR - REQ]", err);
    return [];
  }
};

const findAndCreateMatchesForResource = async (resourceId) => {
  try {
    const nearbyRequests = await prisma.$queryRaw`
      SELECT req.id AS "requestId"
      FROM "requests" req
      JOIN "resources" r ON r.id = ${resourceId}
      WHERE req.category = r.category
        AND req.status = 'open'::"RequestStatus"
        AND ST_DWithin(req.location, r.location, 10000); -- 10km radius
    `;

    const createdMatches = [];
    for (const req of nearbyRequests) {
      const match = await prisma.match.create({
        data: {
          requestId: req.requestId,
          resourceId,
          status: "proposed",
        },
      });
      createdMatches.push(match);
    }
    return createdMatches;
  } catch (err) {
    console.error("[MATCHING SERVICE ERROR - RES]", err);
    return [];
  }
};

module.exports = {
  findAndCreateMatchesForRequest,
  findAndCreateMatchesForResource,
};
