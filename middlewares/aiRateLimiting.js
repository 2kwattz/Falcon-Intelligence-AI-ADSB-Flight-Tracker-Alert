// Middleware to set rate limiting for LLM Requests

const rateLimit = require("express-rate-limit");

const aiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,
    message:{
        status:false,
        message:"You are sending too many requests. Please try again after 15 minutes"
        //   message:"Is this your father's LLM? Stop spamming every 15min. Send requests in moderation"
    }
})

module.exports = aiRateLimiter;