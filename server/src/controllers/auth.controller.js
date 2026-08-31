// server/src/controllers/auth.controller.js
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

// Temporary in-memory OTP store for development
// In production, swap with Redis or SMS provider verification service
const otpStore = new Map();

const sendOtp = async (req, res) => {
  const { phone } = req.body;

  if (!phone || typeof phone !== "string") {
    return res.status(400).json({ error: "Valid phone number is required" });
  }

  // Generate 6-digit OTP (fixed code 123456 in dev mode if preferred, or random)
  const otp =
    process.env.NODE_ENV === "development"
      ? "123456"
      : Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  otpStore.set(phone, { otp, expiresAt });

  console.log(`[AUTH] OTP for ${phone}: ${otp}`);

  return res.status(200).json({
    message: "OTP dispatched successfully",
    devOtp: process.env.NODE_ENV === "development" ? otp : undefined,
  });
};

const verifyOtp = async (req, res) => {
  const { phone, otp, name } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: "Phone and OTP are required" });
  }

  const record = otpStore.get(phone);

  if (!record || record.otp !== otp) {
    return res.status(400).json({ error: "Invalid OTP" });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    return res.status(400).json({ error: "OTP has expired" });
  }

  otpStore.delete(phone);

  // Upsert user in Postgres
  let user = await prisma.user.findUnique({ where: { phone } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        name: name || `Citizen-${phone.slice(-4)}`,
        verified: true,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { phone },
      data: { verified: true, lastActiveAt: new Date() },
    });
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  return res.status(200).json({
    message: "Authentication successful",
    token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      verified: user.verified,
    },
  });
};

const getMe = async (req, res) => {
  return res.status(200).json({ user: req.user });
};

module.exports = { sendOtp, verifyOtp, getMe };
