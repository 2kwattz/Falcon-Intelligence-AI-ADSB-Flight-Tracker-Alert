const express = require("express");
const router = express.Router();

const {
  register,
  login
} = require("../controllers/authController");

const mongodbAuthMiddleware = require("../middleware/mongodbAuthMiddleware");

const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Try again later."
  }
});

// Register
router.post("/register", authLimiter, register);

// Login
router.post("/login", authLimiter, login);

// Protected profile route
router.get("/profile", mongodbAuthMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      username: req.user.username,
      profilePicture: req.user.profilePicture,
      dob: req.user.dob,
      location: req.user.location,
      email: req.user.email,
      createdAt: req.user.createdAt
    }
  });
});

module.exports = router;