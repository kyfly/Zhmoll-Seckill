const config = require('config-lite');
const Redis = require('ioredis');
const redis = new Redis(config.redis);

// todo:去promise化，方便pipeline优化

// Seckill
async function _addSeckill(seckillid, start) {
  // 开始时间
  await redis.hset('Seckill#' + seckillid, 'startAt', start);
  // 总抢人数 attendCount
  // 总抢次数 clickCount
}
async function _isSeckillExist(seckillid) {
  return await redis.exists('Seckill#' + seckillid);
}
async function _whenSeckillStart(seckillid) {
  return await redis.hget('Seckill#' + seckillid, 'startAt');
}
async function _getAwardFromSeckill(seckillid) {
  return JSON.parse(await redis.lpop('Seckill_AwardList#' + seckillid));
}
async function _putAwardIntoSeckill(seckillid, award) {
  return await redis.rpush('Seckill_AwardList#' + seckillid, JSON.stringify(award));
}
async function _countRestAwardInSeckill(seckillid) {
  return await redis.llen('Seckill_AwardList#' + seckillid);
}
redis.Seckill = {
  addSeckill: _addSeckill,
  getAward: _getAwardFromSeckill,
  putAward: _putAwardIntoSeckill,
  countRestAward: _countRestAwardInSeckill,
  exist: _isSeckillExist,
  whenStart: _whenSeckillStart
};

// Blackroom操作（全局）
async function _setTokenIntoBlackRoom(token) {
  return await redis.sadd('BlackRoom', token);
}
async function _removeTokenFromBlackRoom(token) {
  return await redis.sdel('BlackRoom', token);
}
async function _isMemberOfBlackRoom(token) {
  return await redis.sismember('BlackRoom', token);
}
redis.BlackRoom = {
  add: _setTokenIntoBlackRoom,
  remove: _removeTokenFromBlackRoom,
  exist: _isMemberOfBlackRoom
};

// TokenPool操作（全局）
async function _addTokenIntoTokenPool(token) {
  return await redis.hset('TokenPool', token, 45);
}
async function _removeTokenFromTokenPool(token) {
  return await redis.hdel('TokenPool', token);
}
async function _isMemberOfTokenPool(token) {
  return await redis.hexists('TokenPool', token);
}
async function _decrCountOfTokenPool(token) {
  return await redis.hincrby('TokenPool', token, -1);
}
redis.TokenPool = {
  add: _addTokenIntoTokenPool,
  remove: _removeTokenFromTokenPool,
  exist: _isMemberOfTokenPool,
  decrement: _decrCountOfTokenPool
};

// SocketTokenTable操作（全局）
async function _getTokenFromSocketTokenTable(token) {
  return await redis.hget('SocketTokenTable', token);
}
async function _setTokenToSocketTokenTable(token, socketid) {
  return await redis.hset('SocketTokenTable', token, socketid);
}
async function _removeTokenFromSocketTokenTable(token) {
  return await redis.hdel('SocketTokenTable', token);
}
redis.SocketTokenTable = {
  get: _getTokenFromSocketTokenTable,
  set: _setTokenToSocketTokenTable,
  remove: _removeTokenFromSocketTokenTable
};

module.exports = redis;