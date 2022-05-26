const Redis = require('redis');

module.exports.getOrSetCache = (key, cb) => {
    const redisClient = Redis.createClient({
        url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
    });
    return new Promise(async (resolve, reject) => {
        await redisClient.connect();
        const data = await redisClient.get(key);
        if (data != null) {
            await redisClient.disconnect();
            return resolve(JSON.parse(data));
        } else {
            const freshData = await cb();
            console.log(freshData);
            await redisClient.setEx(key, 60, JSON.stringify(freshData)); // Data Expired time : 60s.
            await redisClient.disconnect();
            resolve(freshData);
        }
    })
}