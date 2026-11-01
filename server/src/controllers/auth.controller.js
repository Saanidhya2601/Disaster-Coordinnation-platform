const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const prisma = new PrismaClient();

const otpStore = new Map();

const sendOtp = async (req, res) => {
  const { phone } = req.body;
  if (!phone || typeof phone !== "string") {
    return res.status(400).json({ error: "Valid phone number is required" });
  }

  // Fallback to 123456 unless SMS provider is configured in production
  const otp =
    process.env.SMS_ENABLED === "true"
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : "123456";
  const expiresAt = Date.now() + 5 * 60 * 1000;

  otpStore.set(phone, { otp, expiresAt });
  console.log(`[AUTH] OTP for ${phone}: ${otp}`);

  return res.status(200).json({ message: "OTP sent", devOtp: otp });
};

const verifyOtp = async (req, res) => {
  const { phone, otp, name } = req.body;
  const record = otpStore.get(phone);

  if (!record || record.otp !== otp || Date.now() > record.expiresAt) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  otpStore.delete(phone);

  try {
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({
        data: { phone, name: name || "Responder", role: "volunteer" },
      });
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role, name: user.name },
      process.env.JWT_SECRET || "rescuebridge_super_secret_key",
      { expiresIn: "7d" },
    );

    return res.status(200).json({ token, user });
  } catch (error) {
    console.error("[AUTH VERIFY ERROR]", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
};

module.exports = { sendOtp, verifyOtp };
