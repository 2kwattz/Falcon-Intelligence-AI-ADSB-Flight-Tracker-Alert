const { Redis } = require('ioredis');

const redisClient = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
}); // It will hit our redis server

module.exports = redisClient



