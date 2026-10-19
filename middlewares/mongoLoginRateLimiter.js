const crypto = require("node:crypto");

const redisClient = require("../redis/redisClient");

const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_SECONDS = 60 * 60;
const REDIS_INCREMENT_WITH_EXPIRY = `
  local attempts = redis.call("INCR", KEYS[1])
  if attempts == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[1])
  end
  return { attempts, redis.call("TTL", KEYS[1]) }
`;

const normalizeIdentifier = (value) => typeof value === "string"
  ? value.trim().toLowerCase()
  : "";

const loginAttemptKey = (req) => {
  const identifier = normalizeIdentifier(req.body?.identifier || req.body?.email) || "missing-identifier";
  const clientIp = String(req.ip || req.socket?.remoteAddress || "unknown-ip");
  const fingerprint = crypto
    .createHash("sha256")
    .update(`${identifier}\u0000${clientIp}`)
    .digest("hex");

  return `auth:mongo:login:${fingerprint}`;
};

const createMongoLoginRateLimiter = (client = redisClient) => async (req, res, next) => {
  const key = loginAttemptKey(req);

  try {
    const [attempts, ttl] = await client.eval(
      REDIS_INCREMENT_WITH_EXPIRY,
      1,
      key,
      String(LOGIN_WINDOW_SECONDS)
    );
    const attemptCount = Number(attempts);
    const retryAfterSeconds = Math.max(Number(ttl) || LOGIN_WINDOW_SECONDS, 1);

    if (attemptCount > MAX_LOGIN_ATTEMPTS) {
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message: "Too many login attempts. Try again later."
      });
    }

    return next();
  } catch (error) {
    // Failing open would allow unlimited password guesses while Redis is down.
    console.error("Mongo login rate limiter unavailable:", error.message);
    return res.status(503).json({
      success: false,
      message: "Login is temporarily unavailable. Try again later."
    });
  }
};

const mongoLoginRateLimiter = createMongoLoginRateLimiter();

module.exports = {
  mongoLoginRateLimiter,
  createMongoLoginRateLimiter,
  loginAttemptKey,
  MAX_LOGIN_ATTEMPTS,
  LOGIN_WINDOW_SECONDS
};
