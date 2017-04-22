const Redis = require('ioredis');
const config = require('config-lite');
const redis = new Redis(config.redis);
const Seckill = require('../models/seckills');
const Token = require('../models/tokens');

// 取奖品脚本
redis.defineCommand('lua_fetchAward', {
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
        local award = redis.call("LPOP",KEYS[2])
        redis.call("HSET",KEYS[1],ARGV[1],award)
        return award`
});

// 返还奖品脚本
redis.defineCommand('lua_turnBackAward', {
  numberOfKeys: 4,
  lua: `redis.call("HSET",KEYS[4],ARGV[1],ARGV[2])
       if redis.call("HEXISTS",KEYS[1],ARGV[1]) == 1 then
          local award = redis.call("HGET",KEYS[1],ARGV[1])
          redis.call("RPUSH",KEYS[2],award)
          redis.call("HDEL",KEYS[1],ARGV[1])
          redis.call("HINCRBY",KEYS[3],"turnBackCount",1)
          return award
        end`
});

// redis缓存初始化秒杀活动
function _initSeckill(seckillid, startAt, awards) {
  const pipeline = redis.pipeline()
    .hset('Seckill#' + seckillid, 'startAt', startAt)
    .hset('Seckill#' + seckillid, 'connectCount', 0)
    .hset('Seckill#' + seckillid, 'clickCount', 0)
    .hset('Seckill#' + seckillid, 'turnBackCount', 0)
    .hset('Seckill#' + seckillid, 'maxOnline', 0);
  if (!awards)
    throw new Error('未将奖品加入秒杀缓存中');
  pipeline.ltrim('Seckill_AwardPool#' + seckillid, -1, 0)// 清空原来的奖品池
  awards.forEach(item => {
    pipeline.rpush('Seckill_AwardPool#' + seckillid, JSON.stringify(item));
  });
  return pipeline.exec(); // 返回 results 不重要
}

// 更新数据
function _refreshData(seckillid, update) {
  const pipeline = redis.pipeline()
    .llen('Seckill_AwardPool#' + seckillid)         // 奖品余量
    .hlen('Seckill_BlackRoom#' + seckillid)         // 作弊人数
    .hget('Seckill#' + seckillid, 'turnBackCount')  // 作弊奖品被退回次数
    .hkeys('Seckill_AwardList#' + seckillid);        // 获奖token
  if (update.connect_count) {
    pipeline.hincrby('Seckill#' + seckillid, 'connectCount', update.connect_count);
  }
  if (update.click_count) {
    pipeline.hincrby('Seckill#' + seckillid, 'clickCount', update.click_count)
  }
  if (update.max_online) {
    pipeline.hset('Seckill#' + seckillid, 'maxOnline', update.max_online)
  }
  return pipeline.exec();
}

// 从奖品池取奖品
function _fetchAward(seckillid, token) {
  return redis.lua_fetchAward(
    'Seckill_AwardList#' + seckillid,
    'Seckill_AwardPool#' + seckillid,
    'Seckill_BlackRoom#' + seckillid,
    token
  );
}

// 将奖品归还奖品池
function _turnBackAward(seckillid, token, reason) {
  console.log(reason);
  return redis.lua_turnBackAward(
    'Seckill_AwardList#' + seckillid,
    'Seckill_AwardPool#' + seckillid,
    'Seckill#' + seckillid,
    'Seckill_BlackRoom#' + seckillid,
    token,
    reason,
    'turnBackCount'
  );
}

// 从缓存数据库将获奖名单持久化
function _persistData(seckillid) {
  // 获奖结果
  redis.hgetall('Seckill_AwardList#' + seckillid, function (err, awardlist) {
    Object.entries(awardlist).forEach(item => {
      // item[0] token
      // item[1] award -> JSON.parse(item[1]) 转化为对象
      Token
        .findOne({ token: item[0], seckillid: seckillid })
        // .populate('seckillid')
        .exec((err, token) => {
          if (err || !token) return;
          token.content = JSON.parse(item[1]);
          token.save();
        });
    });
  });

  // 黑名单持久化
  redis.hgetall('Seckill_BlackRoom#' + seckillid, function (err, tokenlist) {
    Object.entries(tokenlist).forEach(item => {
      // item[0] token
      // item[1] reason
      Token
        .findOne({ token: item[0], seckillid: seckillid })
        // .populate('seckillid')
        .exec((err, token) => {
          if (err || !token) return;
          token.blocked = true;
          token.blockReason = item[1];
          token.save();
        });
    });
  });

  // 放置抢票结果数据
  redis.hgetall('Seckill#' + seckillid, function (err, tokenlist) {
    Seckill
      .findById(seckillid)
      .exec((err, seckill) => {
        if (err || !seckill) return;
        Object.entries(tokenlist).forEach(item => {
          const key = item[0];
          const value = item[1];
          switch (key) {
            // 用了
            case 'clickCount': seckill.consequence.clickCount = value; break;
            case 'connectCount': seckill.consequence.connectCount = value; break;
            case 'turnBackCount': seckill.consequence.turnBackCount = value; break;
            case 'maxOnline': seckill.consequence.maxOnline = value; break;
            // 下面没有用到
            case 'attendCount': seckill.consequence.attendCount = value; break;
            case 'finishTime': seckill.consequence.finishTime = value; break;
            case 'loginCount': seckill.consequence.loginCount = value; break;
          }
        });
        seckill.save();
      });
  });
}

redis.Seckill = {
  addSeckill: _initSeckill,
  refreshData: _refreshData,
  persistData: _persistData,
  fetchAward: _fetchAward,
  turnBackAward: _turnBackAward,
};

// TokenPool操作 hash
// 登录时允许websocket服务器登录
function _addTokenIntoTokenPool(seckillid, token) {
  return redis.hset('Seckill_TokenPool#' + seckillid, token, 'none');
}

// 更新token连接的socketid
function _setTokenWithSocketid(seckillid, token, socketid) {
  return redis.hset('Seckill_TokenPool#' + seckillid, token, socketid);
}

// 获取目前token连接的socketid
function _getTokenWithSocketid(seckillid, token) {
  return redis.hget('Seckill_TokenPool#' + seckillid, token);
}

redis.TokenPool = {
  add: _addTokenIntoTokenPool,
  set: _setTokenWithSocketid,
  get: _getTokenWithSocketid
};

// BlackRoom操作 hash
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

// handShakeCheck
// 检验   seckillid是否存在、
//        seckillid的活动时间是否允许登录、
//        token是否存在、
//        token是否在黑名单中，
//        并且都存在的话拿到socketid_in_db
redis.handShakeCheck = function (seckillid, token) {
  return redis.pipeline()
    .hget('Seckill_TokenPool#' + seckillid, token)     // 拿不到说明 要么没有seckill，要么没有token在里面，拿到了的是socketid_in_db
    .hexists('Seckill_BlackRoom#' + seckillid, token)  // 1 是在黑名单里面， 0 是不在
    .hget('Seckill#' + seckillid, 'startAt')           // 活动开始时间，交给握手函数去判断是否允许握手
    .exec();
  // 返回 results => [[null, socketid_in_db], [null, 0], [null, startAt]]
};

module.exports = redis;