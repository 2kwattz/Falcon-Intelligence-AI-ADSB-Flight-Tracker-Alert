const express = require("express"); // NodeJs Framework
const router = express.Router(); // Express Router
const redisClient = require("../redis/redisClient"); // Caching
const authMiddleware = require("../middlewares/authMiddleware"); // Auth Middleware



module.exports = router;