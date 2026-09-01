// server/prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Clearing old data...");
  await prisma.match.deleteMany();
  await prisma.$executeRaw`DELETE FROM "resources"`;
  await prisma.$executeRaw`DELETE FROM "requests"`;
  await prisma.alert.deleteMany();
  await prisma.$executeRaw`DELETE FROM "checkins"`;
  await prisma.user.deleteMany();

  console.log("Seeding Users...");

  const user1 = await prisma.user.create({
    data: {
      phone: "9999999991",
      name: "Amit (Requester)",
      role: "requester",
      verified: true,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      phone: "9999999992",
      name: "Priya (Responder)",
      role: "volunteer",
      verified: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      phone: "9999999999",
      name: "System Admin",
      role: "admin",
      verified: true,
    },
  });

  console.log("Seeding Requests & Resources near Pune...");

  // Create a Medical Request at Pune Center
  await prisma.$queryRaw`
    INSERT INTO "requests" (
      "id", "createdById", "category", "description", "urgency", 
      "location", "status", "updatedAt"
    ) VALUES (
      gen_random_uuid(), ${user1.id}, 'medical'::"Category", 'Need emergency first aid kits', 
      'high'::"Urgency", ST_MakePoint(73.8567, 18.5204)::geography, 'open'::"RequestStatus", NOW()
    )
  `;

  // Create a Medical Resource ~2km away to trigger a match
  await prisma.$queryRaw`
    INSERT INTO "resources" (
      "id", "offeredById", "category", "description", "quantityAvailable", 
      "location", "status", "updatedAt"
    ) VALUES (
      gen_random_uuid(), ${user2.id}, 'medical'::"Category", 'Offering 10 first aid kits', 
      10, ST_MakePoint(73.8700, 18.5300)::geography, 'available'::"ResourceStatus", NOW()
    )
  `;

  console.log("Database successfully seeded!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
