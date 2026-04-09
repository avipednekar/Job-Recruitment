import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_change_me";

export const protect = async (req, res, next) => {
  let token;

  // 1. Check cookie first
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Fallback to Authorization header (for Postman / mobile apps)
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ error: "Not authorized — no token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Not authorized — invalid token" });
  }
};

export const optionalProtect = async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user) {
      req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    }
  } catch (err) {
    req.user = undefined;
  }

  next();
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: `Role '${req.user?.role}' is not authorized` });
    }
    next();
  };
};
