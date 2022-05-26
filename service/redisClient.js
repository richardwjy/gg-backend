const Redis = require('redis');

module.exports.getOrSetCache = (key, cb) => {
    const redisClient = Redis.createClient({
        url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
    });
    console.log(`redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`)
    return new Promise(async (resolve, reject) => {
        await redisClient.connect();
        const data = await redisClient.get(key);
        console.log(data);
        if (data != null) {
            await redisClient.disconnect();
            console.log("langsung")
            return resolve(JSON.parse(data));
        } else {
            const freshData = await cb();
            console.log(freshData);
            await redisClient.setEx(key, Number(process.env.DEFAULT_EXPIRATION), JSON.stringify(freshData)); // Data Expired time : 60s.
            console.log("Set")
            await redisClient.disconnect();
            resolve(freshData);
        }
    })
}