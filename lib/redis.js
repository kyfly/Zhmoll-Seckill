const config = require('config-lite');
const Redis = require('ioredis');
const redis = new Redis(config.redis);

module.exports = redis;