const express = require("express");
const multer = require("multer");
const router = express.Router();

const {
  register,
  login,
  verifyLoginOtp,
  logout,
  getProfile,
  getLoginActivity,
  clearLoginActivity,
  updateProfilePicture
} = require("../controllers/authController");

const mongodbAuthMiddleware = require("../middlewares/mongodbAuthMiddleware");
const { mongoLoginRateLimiter } = require("../middlewares/mongoLoginRateLimiter");

const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Try again later."
  }
});

const profilePictureUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  }
});

const uploadProfilePicture = (req, res, next) => {
  profilePictureUpload.single("profilePicture")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "Profile photos must be 5 MB or smaller."
      });
    }

    return res.status(400).json({
      success: false,
      message: "Upload one profile photo at a time."
    });
  });
};

// Register
router.post("/register", authLimiter, register);

// Every password login requires a second email code before a session is issued.
router.post("/login", mongoLoginRateLimiter, login);
router.post("/login/verify-otp", mongoLoginRateLimiter, verifyLoginOtp);

router.post("/logout", logout);

// `/me` is convenient for clients. Keep `/profile` as an alias for the
// original MongoDB auth draft.
router.get("/me", mongodbAuthMiddleware, getProfile);
router.get("/profile", mongodbAuthMiddleware, getProfile);
router.patch("/profile/picture", mongodbAuthMiddleware, uploadProfilePicture, updateProfilePicture);
router.get("/login-activity", mongodbAuthMiddleware, getLoginActivity);
router.delete("/login-activity", mongodbAuthMiddleware, clearLoginActivity);

module.exports = router;
