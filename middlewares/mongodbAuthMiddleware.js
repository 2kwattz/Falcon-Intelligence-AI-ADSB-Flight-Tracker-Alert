const jwt = require("jsonwebtoken");
const User = require("../models/User");

const getJwtSecret = () => process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;

const getToken = (req) => {
  const authHeader = req.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  // The browser login cookie is intentionally separate from the legacy MySQL
  // `token` cookie.
  return req.cookies?.mongoToken;
};

const shouldRedirectToLogin = (req) => {
  if (req.path.startsWith("/api/")) return false;
  return req.accepts(["html", "json"]) === "html";
};

const unauthenticatedResponse = (req, res, message) => {
  if (shouldRedirectToLogin(req)) {
    return res.set("Cache-Control", "no-store").redirect(302, "/login");
  }

  return res.status(401).json({
    success: false,
    message
  });
};

const mongodbAuthMiddleware = async (req, res, next) => {
  try {
    const token = getToken(req);
    const jwtSecret = getJwtSecret();

    if (!token) {
      return unauthenticatedResponse(req, res, "Authentication token required");
    }

    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured");
      return res.status(500).json({
        success: false,
        message: "Authentication is not configured"
      });
    }

    const decoded = jwt.verify(
      token,
      jwtSecret,
      {
        algorithms: ["HS256"],
        issuer: process.env.JWT_ISSUER || "falcon-intelligence",
        audience: process.env.JWT_AUDIENCE || "falcon-intelligence-web"
      }
    );

    const user = await User.findById(decoded.userId);

    if (!user) {
      return unauthenticatedResponse(req, res, "User no longer exists");
    }

    req.user = user;

    return next();

  } catch (error) {
    if (error.name !== "JsonWebTokenError" && error.name !== "TokenExpiredError") {
      console.error("MongoDB authentication error:", error.message);
    }

    return unauthenticatedResponse(req, res, "Invalid or expired token");
  }
};

module.exports = mongodbAuthMiddleware;
