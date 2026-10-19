const User = require("../models/User");
const bcrypt = require("bcrypt");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const jwt = require("jsonwebtoken");
const path = require("node:path");

// The existing MySQL authentication system already owns the `token` cookie.
// A distinct cookie prevents a MongoDB login from replacing its session.
const TOKEN_COOKIE = "mongoToken";
const DEFAULT_TOKEN_TTL = "1d";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-z0-9_]+$/;
const profilePictureDirectory = path.resolve(__dirname, "../public/uploads/profile-pictures");
const profilePictureUrlPrefix = "/uploads/profile-pictures/";

const getJwtSecret = () => process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;

const generateToken = (userId) => {
  const secret = getJwtSecret();

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    { userId: userId.toString() },
    secret,
    {
      algorithm: "HS256",
      expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_TOKEN_TTL,
      issuer: process.env.JWT_ISSUER || "falcon-intelligence",
      audience: process.env.JWT_AUDIENCE || "falcon-intelligence-web"
    }
  );
};

const publicUser = (user) => ({
  id: user._id.toString(),
  firstName: user.firstName,
  lastName: user.lastName,
  profilePicture: user.profilePicture,
  username: user.username,
  dob: user.dob,
  location: user.location,
  email: user.email,
  createdAt: user.createdAt
});

const tokenCookieOptions = () => ({
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  // This uses a separate name from the legacy MySQL `token` cookie, so it does
  // not replace the existing MySQL session.
  path: "/"
});

const legacyTokenCookieOptions = () => ({
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/auth/mongo"
});

const sendAuthenticatedResponse = (res, statusCode, message, user) => {
  const token = generateToken(user._id);

  return res
    // Remove the earlier path-scoped cookie so browsers do not retain two
    // `mongoToken` cookies after this dashboard update.
    .clearCookie(TOKEN_COOKIE, legacyTokenCookieOptions())
    .cookie(TOKEN_COOKIE, token, tokenCookieOptions())
    .status(statusCode)
    .json({
      success: true,
      message,
      // API clients can use this as a Bearer token. Browsers can rely on the
      // HttpOnly cookie set above.
      token,
      user: publicUser(user)
    });
};

const requiredText = (value) => typeof value === "string" ? value.trim() : "";

const profilePictureExtension = (buffer) => {
  if (!Buffer.isBuffer(buffer)) return null;

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "jpg";
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }

  return null;
};

const managedProfilePictureFilename = (userId, value) => {
  if (typeof value !== "string" || !value.startsWith(profilePictureUrlPrefix)) {
    return null;
  }

  const filename = value.slice(profilePictureUrlPrefix.length);
  const expectedFilename = new RegExp(`^profile-${userId}-[a-f0-9-]{36}\\.(jpg|png|webp)$`);

  return expectedFilename.test(filename) && path.basename(filename) === filename
    ? filename
    : null;
};

// REGISTER USER
exports.register = async (req, res) => {
  try {
    const firstName = requiredText(req.body.firstName);
    const lastName = requiredText(req.body.lastName);
    const profilePicture = requiredText(req.body.profilePicture);
    const username = requiredText(req.body.username).toLowerCase();
    const dob = req.body.dob;
    const location = requiredText(req.body.location);
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    const email = requiredText(req.body.email).toLowerCase();

    if (
      !firstName ||
      !lastName ||
      !username ||
      !dob ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing"
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    if (typeof password !== "string" || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 12 characters and at most 72 UTF-8 bytes"
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required"
      });
    }

    if (username.length < 3 || username.length > 30 || !usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        message: "Username must be 3-30 characters and contain only letters, numbers, or underscores"
      });
    }

    const existingUser = await User.findOne({
      $or: [
        { email },
        { username }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email or username already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      firstName,
      lastName,
      profilePicture,
      username,
      dob,
      location,
      email,
      password: hashedPassword
    });

    return sendAuthenticatedResponse(res, 201, "Registration successful", user);

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or username already registered"
      });
    }

    if (error.name === "ValidationError" ||
        error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid registration data"
      });
    }

    console.error("MongoDB registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create account"
    });
  }
};

// LOGIN USER
exports.login = async (req, res) => {
  try {
    // Accept `email` for API clients and `identifier` for clients that allow
    // either a username or an email address.
    const identifier = requiredText(req.body.identifier || req.body.email).toLowerCase();
    const password = req.body.password;

    if (!identifier || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email or username and password are required"
      });
    }

    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier }
      ]
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    return sendAuthenticatedResponse(res, 200, "Login successful", user);

  } catch (error) {
    console.error("MongoDB login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to log in"
    });
  }
};

// LOGOUT USER
exports.logout = (req, res) => {
  res.clearCookie(TOKEN_COOKIE, tokenCookieOptions());
  res.clearCookie(TOKEN_COOKIE, legacyTokenCookieOptions());
  return res.status(200).json({ success: true, message: "Logged out" });
};

// PROTECTED PROFILE
exports.getProfile = (req, res) => res.status(200).json({
  success: true,
  user: publicUser(req.user)
});

// PROTECTED PROFILE PICTURE UPDATE
exports.updateProfilePicture = async (req, res) => {
  let createdPicturePath = null;

  try {
    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: "Choose a JPEG, PNG, or WebP profile photo."
      });
    }

    const extension = profilePictureExtension(req.file.buffer);
    if (!extension) {
      return res.status(400).json({
        success: false,
        message: "The selected file is not a supported image. Choose a JPEG, PNG, or WebP photo."
      });
    }

    const userId = req.user._id.toString();
    const oldFilename = managedProfilePictureFilename(userId, req.user.profilePicture);
    const filename = `profile-${userId}-${crypto.randomUUID()}.${extension}`;

    await fs.mkdir(profilePictureDirectory, { recursive: true });
    createdPicturePath = path.join(profilePictureDirectory, filename);
    await fs.writeFile(createdPicturePath, req.file.buffer, { flag: "wx" });

    req.user.profilePicture = `${profilePictureUrlPrefix}${filename}`;
    await req.user.save();

    if (oldFilename) {
      await fs.unlink(path.join(profilePictureDirectory, oldFilename)).catch((error) => {
        if (error.code !== "ENOENT") {
          console.error("Unable to remove replaced profile picture:", error.message);
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture updated.",
      user: publicUser(req.user)
    });
  } catch (error) {
    if (createdPicturePath) {
      await fs.unlink(createdPicturePath).catch(() => {});
    }

    console.error("Profile picture update error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to update your profile picture."
    });
  }
};
