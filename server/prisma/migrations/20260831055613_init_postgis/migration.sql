CREATE EXTENSION IF NOT EXISTS postgis;
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('requester', 'volunteer', 'coordinator', 'admin');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('food', 'water', 'shelter', 'medical', 'clothing', 'rescue', 'other');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('open', 'matched', 'fulfilled', 'cancelled');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('available', 'reserved', 'depleted');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('proposed', 'accepted', 'in_transit', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "CheckinStatus" AS ENUM ('safe', 'missing', 'unreachable');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('info', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('request', 'resource', 'checkin', 'user');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'reviewed', 'actioned', 'dismissed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "role" "Role" NOT NULL DEFAULT 'requester',
    "location" geography(Point, 4326),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "trustScore" INTEGER NOT NULL DEFAULT 0,
    "otpCode" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "createdById" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "contactPhone" TEXT,
    "category" "Category" NOT NULL,
    "description" TEXT NOT NULL,
    "urgency" "Urgency" NOT NULL,
    "peopleAffected" INTEGER,
    "quantityNeeded" TEXT,
    "location" geography(Point, 4326) NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'open',
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "offeredById" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "description" TEXT NOT NULL,
    "quantityAvailable" TEXT,
    "location" geography(Point, 4326) NOT NULL,
    "availabilityStart" TIMESTAMP(3),
    "availabilityEnd" TIMESTAMP(3),
    "status" "ResourceStatus" NOT NULL DEFAULT 'available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "status" "MatchStatus" NOT NULL DEFAULT 'proposed',
    "confirmedByRequester" BOOLEAN NOT NULL DEFAULT false,
    "confirmedByVolunteer" BOOLEAN NOT NULL DEFAULT false,
    "cancelReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationToPerson" TEXT,
    "reportedById" TEXT,
    "status" "CheckinStatus" NOT NULL,
    "lastKnownLocation" geography(Point, 4326),
    "lastSeenAt" TIMESTAMP(3),
    "contactPhone" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "centerPoint" geography(Point, 4326),
    "radiusKm" DOUBLE PRECISION,
    "affectedArea" geography(Polygon, 4326),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'pending',
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "requests_status_category_idx" ON "requests"("status", "category");

-- CreateIndex
CREATE INDEX "requests_urgency_idx" ON "requests"("urgency");

-- CreateIndex
CREATE INDEX "requests_createdAt_idx" ON "requests"("createdAt");

-- CreateIndex
CREATE INDEX "resources_status_category_idx" ON "resources"("status", "category");

-- CreateIndex
CREATE INDEX "resources_createdAt_idx" ON "resources"("createdAt");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "matches_requestId_resourceId_status_key" ON "matches"("requestId", "resourceId", "status");

-- CreateIndex
CREATE INDEX "checkins_status_idx" ON "checkins"("status");

-- CreateIndex
CREATE INDEX "alerts_severity_idx" ON "alerts"("severity");

-- CreateIndex
CREATE INDEX "alerts_expiresAt_idx" ON "alerts"("expiresAt");

-- CreateIndex
CREATE INDEX "reports_targetType_targetId_idx" ON "reports"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_offeredById_fkey" FOREIGN KEY ("offeredById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS user_location_idx     ON users     USING GIST (location);
CREATE INDEX IF NOT EXISTS request_location_idx  ON requests  USING GIST (location);
CREATE INDEX IF NOT EXISTS resource_location_idx ON resources USING GIST (location);
CREATE INDEX IF NOT EXISTS checkin_location_idx  ON checkins  USING GIST ("lastKnownLocation");
CREATE INDEX IF NOT EXISTS alert_center_idx      ON alerts    USING GIST ("centerPoint");
CREATE INDEX IF NOT EXISTS alert_area_idx        ON alerts    USING GIST ("affectedArea");