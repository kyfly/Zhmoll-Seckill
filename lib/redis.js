const config = require('config-lite');
const Redis = require('ioredis');
const redis = new Redis(config.redis);

redis.defineCommand('fetchAward', {
  numberOfKeys: 2,
  lua: `if redis.call("HEXISTS",KEYS[1],ARGV[1]) == 1 then
          return 11
        else
          if redis.call("LLEN",KEYS[2])<1 then
            return 12
          else
            if tonumber(ARGV[2])<7 then
              return 13
            else
              local award = redis.call("LPOP",KEYS[2])
              redis.call("HSET",KEYS[1],ARGV[1],award)
            return award
            end
          end
      end`
});

redis.defineCommand('turnBack', {
  numberOfKeys: 2,
  lua: `redis.call("SADD","BlackRoom",ARGV[1])
        if redis.call("HEXISTS",KEYS[1],ARGV[1]) == 1 then
          local award = redis.call("HGET",KEYS[1],ARGV[1])
          redis.call("RPUSH",KEYS[2],award)
          redis.call("HDEL",KEYS[1],ARGV[1])
          return award
        else
          return
        end`
});

// todo:去promise化，方便pipeline优化

// Seckill
async function _addSeckill(seckillid, start) {
  // 开始时间
  await redis.hset('Seckill#' + seckillid, 'startAt', start);
  // 总抢人数 attendCount
  // 总抢次数 clickCount
}
function _isSeckillExist(seckillid) {
  return redis.exists('Seckill#' + seckillid);
}
function _whenSeckillStart(seckillid) {
  return redis.hget('Seckill#' + seckillid, 'startAt');
}
async function _getAwardFromSeckill(seckillid) {
  return JSON.parse(await redis.lpop('Seckill_AwardPool#' + seckillid));
}
function _putAwardIntoSeckill(seckillid, award) {
  return redis.rpush('Seckill_AwardPool#' + seckillid, JSON.stringify(award));
}
function _fetchAward(seckillid, token, random) {
  return redis.fetchAward('Seckill_AwardList#' + seckillid, 'Seckill_AwardPool#' + seckillid, token, random);
}
function _turnBack(seckillid, token) {
  return redis.turnBack('Seckill_AwardList#' + seckillid, 'Seckill_AwardPool#' + seckillid, token);
}
function _countRestAwardInSeckill(seckillid) {
  return redis.llen('Seckill_AwardPool#' + seckillid);
}
redis.Seckill = {
  addSeckill: _addSeckill,
  getAward: _getAwardFromSeckill,
  putAward: _putAwardIntoSeckill,
  countRestAward: _countRestAwardInSeckill,
  exist: _isSeckillExist,
  whenStart: _whenSeckillStart,
  fetchAward: _fetchAward,
  turnBackAward: _turnBack
};

// BlackRoom操作（全局）
function _setTokenIntoBlackRoom(token) {
  return redis.sadd('BlackRoom', token);
}
function _removeTokenFromBlackRoom(token) {
  return redis.srem('BlackRoom', token);
}
function _isMemberOfBlackRoom(token) {
  return redis.sismember('BlackRoom', token);
}
redis.BlackRoom = {
  add: _setTokenIntoBlackRoom,
  remove: _removeTokenFromBlackRoom,
  exist: _isMemberOfBlackRoom
};

// TokenPool操作（全局）
function _addTokenIntoTokenPool(token) {
  return redis.sadd('TokenPool', token);
}
function _removeTokenFromTokenPool(token) {
  return redis.srem('TokenPool', token);
}
function _isMemberOfTokenPool(token) {
  return redis.sismember('TokenPool', token);
}
redis.TokenPool = {
  add: _addTokenIntoTokenPool,
  remove: _removeTokenFromTokenPool,
  exist: _isMemberOfTokenPool
};

// SocketTokenTable操作（全局）
function _getTokenFromSocketTokenTable(token) {
  return redis.hget('SocketTokenTable', token);
}
function _setTokenToSocketTokenTable(token, socketid) {
  return redis.hset('SocketTokenTable', token, socketid);
}
function _removeTokenFromSocketTokenTable(token) {
  return redis.hdel('SocketTokenTable', token);
}
redis.SocketTokenTable = {
  get: _getTokenFromSocketTokenTable,
  set: _setTokenToSocketTokenTable,
  remove: _removeTokenFromSocketTokenTable
};

module.exports = redis;