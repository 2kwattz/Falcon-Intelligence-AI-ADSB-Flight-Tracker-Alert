const User = require("../models/User");
const bcrypt = require("bcrypt");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const path = require("node:path");
const { LoginActivity, LOGIN_ACTIVITY_RETENTION_SECONDS } = require("../models/LoginActivity");
const deviceParser = require("../utils/deviceParser");

// The existing MySQL authentication system already owns the `token` cookie.
// A distinct cookie prevents a MongoDB login from replacing its session.
const TOKEN_COOKIE = "mongoToken";
const DEFAULT_TOKEN_TTL = "30d";
const DEFAULT_SESSION_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-z0-9_]+$/;
const profilePictureDirectory = path.resolve(__dirname, "../public/uploads/profile-pictures");
const profilePictureUrlPrefix = "/uploads/profile-pictures/";
const LOGIN_OTP_TTL_MS = 5 * 60 * 1000;
const MAX_LOGIN_OTP_ATTEMPTS = 5;
const OTP_PATTERN = /^\d{6}$/;

const gmailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.GMAIL_SMTP, pass: process.env.GMAIL_SMTP_PASSWORD }
});

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

const tokenCookieBaseOptions = () => ({
  // Browser sessions are authenticated by this cookie; application JavaScript
  // must never be able to read or exfiltrate the JWT.
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  // This uses a separate name from the legacy MySQL `token` cookie, so it does
  // not replace the existing MySQL session.
  path: "/"
});

const tokenCookieOptions = () => ({
  ...tokenCookieBaseOptions(),
  // Without Max-Age/Expires this is a session cookie. Mobile browsers can
  // remove session cookies when backgrounding or reclaiming the browser.
  maxAge: Number(process.env.AUTH_SESSION_COOKIE_MAX_AGE_MS) || DEFAULT_SESSION_COOKIE_MAX_AGE_MS
});

const legacyTokenCookieOptions = () => ({
  ...tokenCookieBaseOptions(),
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
      user: publicUser(user)
    });
};

const requiredText = (value) => typeof value === "string" ? value.trim() : "";

const loginOtpSecret = () => process.env.LOGIN_OTP_SECRET || getJwtSecret();

const hashLoginOtp = (challengeId, otp) => {
  const secret = loginOtpSecret();
  if (!secret) throw new Error("LOGIN_OTP_SECRET or JWT_SECRET is not configured");
  return crypto.createHmac("sha256", secret).update(`${challengeId}:${otp}`).digest("hex");
};

const secureEqual = (first, second) => {
  const firstBuffer = Buffer.from(String(first || ""));
  const secondBuffer = Buffer.from(String(second || ""));
  return firstBuffer.length === secondBuffer.length && crypto.timingSafeEqual(firstBuffer, secondBuffer);
};

function clientIp(req) {
  const ip = String(req.ip || req.socket?.remoteAddress || "").trim();
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

const displayDevicePart = (...parts) => parts
  .map((part) => requiredText(String(part || "")))
  .filter(Boolean)
  .join(" ") || "Unknown";

function loginDeviceDetails(req) {
  const parsed = deviceParser(String(req.get("user-agent") || "").slice(0, 2_000));
  const deviceName = displayDevicePart(parsed?.device?.vendor, parsed?.device?.model);
  const deviceType = requiredText(parsed?.device?.type);
  return {
    device: deviceName !== "Unknown"
      ? (deviceType ? `${deviceName} (${deviceType})` : deviceName)
      : (deviceType || "Desktop"),
    browser: displayDevicePart(parsed?.browser?.name, parsed?.browser?.version),
    operatingSystem: displayDevicePart(parsed?.os?.name, parsed?.os?.version)
  };
}

async function sendLoginOtpEmail(user, otp) {
  if (!process.env.GMAIL_SMTP || !process.env.GMAIL_SMTP_PASSWORD) throw new Error("Gmail SMTP is not configured");
  await gmailTransporter.sendMail({
    from: `Falcon Intelligence <${process.env.GMAIL_SMTP}>`, to: user.email,
    subject: "Falcon Intelligence | Your two-factor authentication code",
    text: `Your Falcon Intelligence two-factor authentication code is ${otp}. It expires in 5 minutes. Every login requires this code. If you did not try to log in, change your password immediately.`,
    html: `<p>Your Falcon Intelligence two-factor authentication code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${otp}</p><p>This code expires in 5 minutes. Every login requires this code, regardless of device, browser, or location. If you did not try to log in, change your password immediately.</p>`
  });
}

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
    }).select("+password +pendingLoginOtp");

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

    // This challenge is deliberately created for every correct-password login.
    // Device, browser, IP, and location never bypass two-factor authentication.
    const otp = String(crypto.randomInt(100000, 1_000_000));
    const challengeId = crypto.randomUUID();
    user.pendingLoginOtp = {
      challengeId,
      hash: hashLoginOtp(challengeId, otp),
      expiresAt: new Date(Date.now() + LOGIN_OTP_TTL_MS),
      attempts: 0,
      location: {}
    };
    await user.save();

    try {
      await sendLoginOtpEmail(user, otp);
    } catch (error) {
      user.pendingLoginOtp = undefined;
      await user.save();
      console.error("Login OTP email error:", error.message);
      return res.status(503).json({ success: false, message: "Two-factor authentication email is unavailable. Please try again later." });
    }

    return res.status(202).json({
      success: false,
      requiresTwoFactorOtp: true,
      challengeId,
      expiresInSeconds: LOGIN_OTP_TTL_MS / 1000,
      message: "A two-factor authentication code was sent to your registered email address."
    });

  } catch (error) {
    console.error("MongoDB login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to log in"
    });
  }
};

exports.verifyLoginOtp = async (req, res) => {
  try {
    const challengeId = requiredText(req.body?.challengeId);
    const otp = requiredText(req.body?.otp);
    if (!challengeId || !OTP_PATTERN.test(otp)) {
      return res.status(400).json({ success: false, message: "Enter the six-digit verification code." });
    }

    // Each pending OTP child is marked `select: false` in the schema. Select
    // the individual fields explicitly: selecting only the parent object can
    // produce an empty object, which would incorrectly look like an expired
    // challenge even immediately after a code is sent.
    const user = await User.findOne({ "pendingLoginOtp.challengeId": challengeId }).select(
      "+pendingLoginOtp.challengeId +pendingLoginOtp.hash +pendingLoginOtp.expiresAt +pendingLoginOtp.attempts"
    );
    const pending = user?.pendingLoginOtp;
    if (!user || !pending?.expiresAt || pending.expiresAt.getTime() <= Date.now()) {
      return res.status(401).json({ success: false, message: "This verification code has expired. Please log in again." });
    }
    if (Number(pending.attempts || 0) >= MAX_LOGIN_OTP_ATTEMPTS) {
      user.pendingLoginOtp = undefined;
      await user.save();
      return res.status(429).json({ success: false, message: "Too many incorrect codes. Please log in again." });
    }
    if (!secureEqual(pending.hash, hashLoginOtp(challengeId, otp))) {
      pending.attempts = Number(pending.attempts || 0) + 1;
      if (pending.attempts >= MAX_LOGIN_OTP_ATTEMPTS) {
        user.pendingLoginOtp = undefined;
        await user.save();
        return res.status(429).json({ success: false, message: "Too many incorrect codes. Please log in again." });
      }
      await user.save();
      return res.status(401).json({ success: false, message: "OTP is incorrect. Please try again." });
    }

    const loginActivity = await LoginActivity.create({
      user: user._id,
      username: user.username,
      ipAddress: clientIp(req) || "Unavailable",
      ...loginDeviceDetails(req),
      loggedInAt: new Date(),
      loginChallengeId: challengeId
    });
    user.pendingLoginOtp = undefined;
    try {
      await user.save();
    } catch (saveError) {
      await LoginActivity.deleteOne({ _id: loginActivity._id }).catch(() => {});
      throw saveError;
    }
    return sendAuthenticatedResponse(res, 200, "Two-factor authentication verified. Login successful", user);
  } catch (error) {
    console.error("Login OTP verification error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to verify the login code." });
  }
};

// LOGOUT USER
exports.logout = (req, res) => {
  res.clearCookie(TOKEN_COOKIE, tokenCookieBaseOptions());
  res.clearCookie(TOKEN_COOKIE, legacyTokenCookieOptions());
  return res.status(200).json({ success: true, message: "Logged out" });
};

// PROTECTED PROFILE
exports.getProfile = (req, res) => res.status(200).json({
  success: true,
  user: publicUser(req.user)
});

// PROTECTED LOGIN ACTIVITY
exports.getLoginActivity = async (req, res) => {
  try {
    const activeSince = new Date(Date.now() - LOGIN_ACTIVITY_RETENTION_SECONDS * 1000);
    const activities = await LoginActivity.find({ user: req.user._id, loggedInAt: { $gte: activeSince } })
      .sort({ loggedInAt: -1 })
      .limit(500)
      .select("username ipAddress device browser operatingSystem loggedInAt")
      .lean();
    return res.status(200).json({ success: true, retentionDays: 3, activities });
  } catch (error) {
    console.error("Login activity read error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load login activity." });
  }
};

exports.clearLoginActivity = async (req, res) => {
  try {
    const result = await LoginActivity.deleteMany({ user: req.user._id });
    return res.status(200).json({ success: true, message: "Login history cleared.", deletedCount: result.deletedCount });
  } catch (error) {
    console.error("Login activity clear error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to clear login history." });
  }
};

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
