const rateLimit = require("express-rate-limit");

const generalRateLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per window
  message: {
    status: false,
    message:"Too many requests. Please try again later"
  }
})

module.exports =  generalRateLimiter;