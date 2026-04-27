import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { generateOTP, sendOTPEmail } from "../utils/email.utils.js";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_change_me";
const JWT_EXPIRES_IN = "7d";
const OTP_EXPIRY_MINUTES = 10;

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
};

// Cookie options
const cookieOptions = {
  httpOnly: true, // JS cannot access (XSS-safe)
  secure: process.env.NODE_ENV === "production", // HTTPS only in prod
  sameSite: "lax", // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// Helper: send token in both cookie and JSON response
const sendTokenResponse = (res, statusCode, user, token) => {
  res.cookie("token", token, cookieOptions);
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileComplete: user.profileComplete || false,
    },
  });
};

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }

    const validRoles = ["job_seeker", "recruiter"];
    const userRole = validRoles.includes(role) ? role : "job_seeker";

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      // If they exist but aren't verified, let them re-register (resend OTP)
      if (!existingUser.isVerified) {
        const otp = generateOTP();
        existingUser.otp = otp;
        existingUser.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        existingUser.name = name;
        existingUser.password = password;
        existingUser.role = userRole;
        await existingUser.save();

        try {
          await sendOTPEmail(email, otp, name);
        } catch (emailErr) {
          console.error("[AUTH] Failed to send OTP email:", emailErr.message);
        }

        return res.status(200).json({
          success: true,
          requiresVerification: true,
          email: email.toLowerCase(),
          message: "Verification code sent to your email",
        });
      }

      return res
        .status(400)
        .json({ error: "An account with this email already exists" });
    }

    // Generate OTP
    const otp = generateOTP();

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: userRole,
      isVerified: false,
      otp,
      otpExpiry: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    });

    console.log("[AUTH] User registered (pending verification):", user.email, "| role:", user.role);

    // Send OTP email (best-effort — don't fail registration if email fails)
    try {
      await sendOTPEmail(email, otp, name);
    } catch (emailErr) {
      console.error("[AUTH] Failed to send OTP email:", emailErr.message);
    }

    res.status(201).json({
      success: true,
      requiresVerification: true,
      email: user.email,
      message: "Verification code sent to your email",
    });
  } catch (error) {
    console.error("[AUTH] Register Error:", error.message);
    if (error.code === 11000) {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Registration failed" });
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/verify-otp
// ─────────────────────────────────────────────
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+otp +otpExpiry +password",
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ error: "No OTP found. Please request a new one." });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    if (user.otp !== otp.trim()) {
      return res.status(400).json({ error: "Invalid OTP. Please try again." });
    }

    // Mark as verified and clear OTP fields
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save({ validateModifiedOnly: true });

    console.log("[AUTH] Email verified:", user.email);

    const token = generateToken(user);
    sendTokenResponse(res, 200, user, token);
  } catch (error) {
    console.error("[AUTH] Verify OTP Error:", error.message);
    res.status(500).json({ error: "Verification failed" });
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/resend-otp
// ─────────────────────────────────────────────
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await user.save({ validateModifiedOnly: true });

    try {
      await sendOTPEmail(email, otp, user.name);
    } catch (emailErr) {
      console.error("[AUTH] Failed to resend OTP email:", emailErr.message);
      return res.status(500).json({ error: "Failed to send verification email" });
    }

    res.json({
      success: true,
      message: "A new verification code has been sent to your email",
    });
  } catch (error) {
    console.error("[AUTH] Resend OTP Error:", error.message);
    res.status(500).json({ error: "Failed to resend OTP" });
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check email verification
    if (!user.isVerified) {
      return res.status(403).json({
        error: "Please verify your email first",
        requiresVerification: true,
        email: user.email,
      });
    }

    console.log("[AUTH] User logged in:", user.email);

    const token = generateToken(user);
    sendTokenResponse(res, 200, user, token);
  } catch (error) {
    console.error("[AUTH] Login Error:", error.message);
    res.status(500).json({ error: "Login failed" });
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────
export const logout = (req, res) => {
  res.cookie("token", "", { ...cookieOptions, maxAge: 0 });
  res.json({ success: true, message: "Logged out" });
};

// ─────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        candidate: user.candidate,
        profileComplete: user.profileComplete || false,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};
