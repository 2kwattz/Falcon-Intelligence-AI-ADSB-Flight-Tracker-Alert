const { Redis } = require('ioredis');

const redisClient = new Redis(); // It will hit our redis server

module.exports = redisClient


async function init(){
    
    await redisClient.rpush('list1',"test");
    const lengthString = await redisClient.llen('list1');
    console.log("Length of String", lengthString)

    const viewMsg = await redisClient.lrange('list1',0,-1)

    console.log("View Redis ",viewMsg)

}

init();