const rateLimit = require("express-rate-limit");

const generalRateLimiter = rateLimit({
        windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3000, // max 3000 requests per window
  message: {
    status: false,
    message:"Too many requests. Please try again later"
  }
})

module.exports =  generalRateLimiter;