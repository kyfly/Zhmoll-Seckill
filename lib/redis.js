'use strict';
const config = require('config-lite');
const Redis = require('ioredis');
const redis = new Redis(config.redis);
const Seckill = require('../models/seckills');
const Token = require('../models/tokens');

redis.defineCommand('fetchAward', {
  numberOfKeys: 3,
  lua: `if redis.call("HEXISTS",KEYS[3],ARGV[1]) == 1 then
  return 20
  end
if redis.call("HEXISTS",KEYS[1],ARGV[1]) == 1 then
  return 11
end
if redis.call("LLEN",KEYS[2])<1 then
  return 12
end
if tonumber(ARGV[2])<7 then
  return 13
end
local award = redis.call("LPOP",KEYS[2])
redis.call("HSET",KEYS[1],ARGV[1],award)
return award`
  // numberOfKeys: 2,
  // lua: `if redis.call("HEXISTS",KEYS[1],ARGV[1]) == 1 then
  //         return 11
  //       else
  //         if redis.call("LLEN",KEYS[2])<1 then
  //           return 12
  //         else
  //           if tonumber(ARGV[2])<7 then
  //             return 13
  //           else
  //             local award = redis.call("LPOP",KEYS[2])
  //             redis.call("HSET",KEYS[1],ARGV[1],award)
  //           return award
  //           end
  //         end
  //     end`
});

redis.defineCommand('turnBack', {
  numberOfKeys: 2,
  lua: `if redis.call("HEXISTS",KEYS[1],ARGV[1]) == 1 then
          local award = redis.call("HGET",KEYS[1],ARGV[1])
          redis.call("RPUSH",KEYS[2],award)
          redis.call("HDEL",KEYS[1],ARGV[1])
          return award
        end`
});

// todo:去promise化，方便pipeline优化

// Seckill
async function _addSeckill(seckillid, start) {
  // 开始时间
  await redis.hset('Seckill#' + seckillid, 'startAt', start);
  await redis.hset('Seckill#' + seckillid, 'attendCount', 0);
  await redis.hset('Seckill#' + seckillid, 'clickCount', 0);
}
function _isSeckillExist(seckillid) {
  return redis.exists('Seckill#' + seckillid);
}
function _whenSeckillStart(seckillid) {
  return redis.hget('Seckill#' + seckillid, 'startAt');
}
function _putAwardIntoSeckill(seckillid, award) {
  return redis.rpush('Seckill_AwardPool#' + seckillid, JSON.stringify(award));
}
function _fetchAward(seckillid, token, random) {
  return redis.fetchAward(
    'Seckill_AwardList#' + seckillid,
    'Seckill_AwardPool#' + seckillid,
    'Seckill_BlackRoom#' + seckillid,
    token, random);
}
function _turnBack(seckillid, token) {
  return redis.turnBack('Seckill_AwardList#' + seckillid, 'Seckill_AwardPool#' + seckillid, token);
}
function _countRestAwardInSeckill(seckillid) {
  return redis.llen('Seckill_AwardPool#' + seckillid);
}
// 从缓存数据库将获奖名单持久化
function _persisted(seckillid, clickCount) {
  // 总抢次数 clickCount
  const awardlist = redis.hgetall('Seckill_AwardList#' + seckillid);
  Object.entries(awardlist).forEach(item => {
    // item[0] token
    // item[1] award -> JSON.parse(item[1]) 转化为对象
    Token
      .findOne({ token: item[0], seckillid: seckillid })
      .populate('seckillid')
      .exec((err, token) => {
        if (err || !token) return;
        token.content = JSON.parse(item[1]);
        console.log(item[0], item[1]);
        token.save();
      });
  });

  // 放置抢票结果数据
  if (clickCount)
    Seckill
      .findById(seckillid)
      .exec((err, seckill) => {
        seckill.consequence.clickCount = clickCount;
        seckill.save();
      });
}
redis.Seckill = {
  addSeckill: _addSeckill,
  putAward: _putAwardIntoSeckill,
  countRestAward: _countRestAwardInSeckill,
  exist: _isSeckillExist,
  whenStart: _whenSeckillStart,
  fetchAward: _fetchAward,
  turnBackAward: _turnBack,
  persist: _persisted
};

// TokenPool操作
function _addTokenIntoTokenPool(seckillid, token) {
  return redis.hset('Seckill_TokenPool#' + seckillid, token, 'none');
}
function _setTokenWithSocketid(seckillid, token, socketid) {
  return redis.hset('Seckill_TokenPool#' + seckillid, token, socketid);
}
function _getTokenWithSocketid(seckillid, token) {
  return redis.hget('Seckill_TokenPool#' + seckillid, token);
}
function _removeTokenFromTokenPool(seckillid, token) {
  return redis.hdel('Seckill_TokenPool#' + seckillid, token, 'none');
}
function _isMemberOfTokenPool(seckillid, token) {
  return redis.hexists('Seckill_TokenPool#' + seckillid, token);
}
redis.TokenPool = {
  add: _addTokenIntoTokenPool,
  set: _setTokenWithSocketid,
  get: _getTokenWithSocketid,
  remove: _removeTokenFromTokenPool,
  exist: _isMemberOfTokenPool
};

// BlackRoom操作
function _setTokenIntoBlackRoom(seckillid, token, reason) {
  return redis.hset('Seckill_BlackRoom#' + seckillid, token, reason);
}
function _removeTokenFromBlackRoom(seckillid, token) {
  return redis.hdel('Seckill_BlackRoom#' + seckillid, token);
}
function _isMemberOfBlackRoom(seckillid, token) {
  return redis.hexists('Seckill_BlackRoom#' + seckillid, token);
}
redis.BlackRoom = {
  add: _setTokenIntoBlackRoom,
  remove: _removeTokenFromBlackRoom,
  exist: _isMemberOfBlackRoom
};

module.exports = redis;