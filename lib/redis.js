const config = require('config-lite');
const Redis = require('ioredis');
const redis = new Redis(config.redis);

// Blackroom操作
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
  set: _setTokenIntoBlackRoom,
  remove: _removeTokenFromBlackRoom,
  exist: _isMemberOfBlackRoom
};

// TokenPool操作
async function _addTokenIntoTokenPool(token) {
  return await redis.sadd('TokenPool', token);
}
async function _removeTokenFromTokenPool(token) {
  return await redis.sdel('TokenPool', token);
}
async function _isMemberOfTokenPool(token) {
  return await redis.sismember('TokenPool', token);
}
redis.TokenPool = {
  add: _addTokenIntoTokenPool,
  remove: _removeTokenFromTokenPool,
  exist: _isMemberOfTokenPool
};

// SocketTokenTable操作
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