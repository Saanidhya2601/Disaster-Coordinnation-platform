// server/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();
const matchRoutes = require("./src/routes/match.routes");
const checkinRoutes = require("./src/routes/checkin.routes");
const alertRoutes = require("./src/routes/alert.routes");

const { apiLimiter } = require("./src/middleware/rateLimiter");
const prisma = require("./src/lib/prisma");

// Route Imports
const authRoutes = require("./src/routes/auth.routes");
const requestRoutes = require("./src/routes/request.routes");
const resourceRoutes = require("./src/routes/resource.routes");

const app = express();
const server = http.createServer(app);

// Socket.io instance with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);
// Global Middlewares
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());
app.use("/api", apiLimiter);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/checkins", checkinRoutes);
app.use("/api/alerts", alertRoutes);

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const version = await prisma.$queryRaw`SELECT PostGIS_Version();`;
    res.status(200).json({
      status: "ok",
      database: "connected",
      postgis: version[0]?.postgis_version || "active",
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      database: "disconnected",
      error: err.message,
    });
  }
});

// Socket connection lifecycle
io.on("connection", (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`);

  socket.on("zone:join", (zoneId) => {
    socket.join(zoneId);
    console.log(`[SOCKET] ${socket.id} joined zone: ${zoneId}`);
  });

  socket.on("disconnect", () => {
    console.log(`[SOCKET] Client disconnected: ${socket.id}`);
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[DISPATCH BACKEND] Running on port ${PORT}`);
});
