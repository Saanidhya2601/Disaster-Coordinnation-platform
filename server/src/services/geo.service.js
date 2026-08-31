// server/src/services/geo.service.js
const { Prisma } = require("@prisma/client");
const prisma = require("../lib/prisma");

const findNearbyRequests = async (lat, lng, radiusKm, category) => {
  // Use Prisma.sql for parameterized queries to prevent SQL injection
  const categoryFilter = category
    ? Prisma.sql`AND category = ${category}::"Category"`
    : Prisma.empty;

  // ST_MakePoint takes (longitude, latitude)
  // ST_DWithin measures in meters, so radiusKm * 1000
  return prisma.$queryRaw`
    SELECT 
      id, "createdById", "category", "description", "urgency", "status",
      ST_Y(location::geometry) as lat, 
      ST_X(location::geometry) as lng,
      ST_Distance(location, ST_MakePoint(${lng}, ${lat})::geography) / 1000 AS "distanceKm"
    FROM "requests"
    WHERE status = 'open'
      AND ST_DWithin(location, ST_MakePoint(${lng}, ${lat})::geography, ${radiusKm * 1000})
      ${categoryFilter}
    ORDER BY "distanceKm" ASC
  `;
};

module.exports = { findNearbyRequests }; // server/src/services/geo.service.js
const { Prisma } = require("@prisma/client");
const prisma = require("../lib/prisma");

const findNearbyRequests = async (lat, lng, radiusKm, category) => {
  // Use Prisma.sql for parameterized queries to prevent SQL injection
  const categoryFilter = category
    ? Prisma.sql`AND category = ${category}::"Category"`
    : Prisma.empty;

  // ST_MakePoint takes (longitude, latitude)
  // ST_DWithin measures in meters, so radiusKm * 1000
  return prisma.$queryRaw`
    SELECT 
      id, "createdById", "category", "description", "urgency", "status",
      ST_Y(location::geometry) as lat, 
      ST_X(location::geometry) as lng,
      ST_Distance(location, ST_MakePoint(${lng}, ${lat})::geography) / 1000 AS "distanceKm"
    FROM "requests"
    WHERE status = 'open'
      AND ST_DWithin(location, ST_MakePoint(${lng}, ${lat})::geography, ${radiusKm * 1000})
      ${categoryFilter}
    ORDER BY "distanceKm" ASC
  `;
};

module.exports = { findNearbyRequests };
