// IGNORE THIS MIDDLEWARE FOR NOW, REDIS BASED BRUTEFORCE PREVENTER IS ALREADY IN PLACE FOR LOGIN PAGE

const redisClient = require('../redis/redisClient'); // Redis Client for caching

const MAX_ATTEMPTS = 10; // Max Login Attempts
const MAX_WINDOW = 15 * 60; // IP + Email based Lockout Window

const bruteforceGuard = async (req,res,next) => {

    const identifier = req.body.identifier; // User's Email or Username
    const ipAddress = req.body.ipAddress; // User's IP Address

    const key = `login:${identifier}:${ipAddress}`; // Redis Cache Key 
    

    

}

module.exports = bruteforceGuard;