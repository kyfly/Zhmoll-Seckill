const redis = require('./redis');
const config = require('config-lite');

function seckill(seckillid) {
  return seckill_cache_set[seckillid];
}

const seckill_cache_set = {};
class seckill_cache {
  constructor(seckillid, startTime, io) {
    // 初始化数据
    this._seckillid = seckillid;
    this._io = io;
    this._online = 0;
    redis.Seckill.countRestAward(seckillid).then(count => this._rest = count);
    this.start = startTime;
    this.token_count_set = {};
    this.token_avaliable_refresh = setInterval(_refresh, config.seckill.checkTime, this, seckillid);
    const countdown = this.start - Date.now() + config.seckill.cachePreserveLimit;
    this.destory = setTimeout(_destorySeckillCache, countdown, seckillid);
  }
  emit(msg) {
    if (msg) {
      if (typeof msg == 'object') {
        msg.emit('message', { t: Date.now(), h: this._online, r: this._rest });
      }
      else {
        this._io.of('/seckill').to(this._seckillid)
          .emit('message', { h: this._online, r: this._rest, m: msg });
      }
    }
    else {
      this._io.of('/seckill').to(this._seckillid)
        .emit('message', { h: this._online, r: this._rest });
    }
  }
  incre_online() { this._online++; }
  decre_online() { this._online--; }
  incre_rest() { this._rest++; }
  decre_rest() { this._rest--; }
  token_count(token) {
    return this.token_count_set[token]
  }
  decre_token_count(token) {
    const count = --this.token_count_set[token];
    if (count < 0)
      throw new Error('CONCURRENCY_CHEATING_BLOCKED');
  }
}

// 到期删除引用
function _destorySeckillCache(seckillid) {
  clearInterval(seckill(seckillid).token_avaliable_refresh);
  delete seckill(seckillid).token_avaliable_refresh;
  delete seckill(seckillid).token_count_set;
  delete seckill(seckill);

  //clearInterval(seckill_cache_set[seckillid].token_avaliable_refresh);
  // delete seckill_cache_set[seckillid].token_avaliable_refresh;
  // delete seckill_cache_set[seckillid].token_avaliable_count;
  // delete seckill_cache_set[seckillid];
}

// 轮询 - 恢复点击次数
function _refresh(that, seckillid) {
  that.emit();
  const set = seckill(seckillid).token_count_set;
  Object.getOwnPropertyNames(set).forEach((val, idx, array) => {
    set[val] = config.seckill.checkLimit;
  });
}

// 检查seckillid是否存在
async function _checkSockillidExist(seckillid, io) {
  if (seckill(seckillid))
    return;
  else {
    const startTime = await redis.Seckill.whenStart(seckillid);
    if (!startTime)
      throw new Error('SECKILLID_INVALID');
    const difference = startTime - Date.now();
    if (difference + config.seckill.socketPreserveLimit < 0)
      throw new Error('SECKILL_FINISHED');
    seckill_cache_set[seckillid] = new seckill_cache(seckillid, startTime, io);
  }
}

// 检查Token是否被ban（完成）
async function _checkTokenBlocked(token) {
  const isBlocked = await redis.BlackRoom.exist(token);
  if (isBlocked == 1)
    throw new Error('CHEAT_TOKEN_FORBIDDEN');
}

// 检查Token有效性（完成）
async function _checkTokenValid(token) {
  const result = await redis.TokenPool.exist(token);
  if (result == 0)
    throw new Error('TOKEN_INVALID');
}

// 连接认证（完成）
function onAuth(io, socket, data) {
  (async () => {
    const socketid = socket.id.split('#')[1];
    const seckillid = data.seckillid;
    const token = data.token;
    // 0、检查数据完整性
    if (!data || !token || !seckillid)
      throw new Error('DATA_MISSING');
    // 1、并发任务 todo pipeline化
    const pList = [
      // 1.1、[并发]获取数据库同一token的socket
      redis.SocketTokenTable.get(token),
      // 1.2、[并发]检测是否在黑名单里面
      _checkTokenBlocked(token),
      // 1.3、[并发]检测Token是否合法
      _checkTokenValid(token),
      // 1.4、[并发]检测seckillid是否存在及时间可用性
      _checkSockillidExist(seckillid, io)
    ];
    const [socketid_in_db] = await Promise.all(pList);
    // 2、数据库同一token的socket存在就关闭它
    if (socketid_in_db && io.sockets.connected[socketid_in_db])
      io.sockets.connected[socketid_in_db].disconnect(true);
    // 3、设置token的新socket
    await redis.SocketTokenTable.set(token, socketid);
    // 4、设置token反作弊限制次数
    seckill(seckillid).token_count_set[token] = config.seckill.checkLimit;
  })()
    .then(() => {
      // 加入抢票广播房间
      socket.token = data.token;
      socket.seckillid = data.seckillid;
      socket.join(socket.seckillid);
      seckill(socket.seckillid).incre_online();
      seckill(socket.seckillid).emit(socket);
      // 取消两秒认证
      clearTimeout(socket.checkAuth);
    })
    .then(() => {
      // 添加活动结束断连倒计时
      // seckill(socket.seckillid).emit();
      countdown = seckill(socket.seckillid).start - Date.now() + config.seckill.socketPreserveLimit;
      socket.seckillEnd = setTimeout(validateSeckillEnd, countdown, socket);
    })
    .catch(e => {
      console.log('连接认证未通过');
      socket.send({ e: e.message });
      socket.disconnect(true);
    });
}

// 两秒验证（完成）
function validate2seconds(socket) {
  if (!socket.token) {
    console.log('两秒验证未通过');
    socket.emit({ e: 'UNAUTHORIZED_SOCKET' });
    socket.disconnect(true);
  }
}

// 五秒验证
function validate5seconds(socket) {
  (async () => {
    // 1、检查token的socket
    const socket_in_db = await redis.SocketTokenTable.get(socket.token);
    const socketid = socket.id.split('#')[1];
    // 2、检查token的socket是否不匹配，不匹配即为同一个token开了多个socket
    if (socket_in_db != socketid)
      throw new Error('MUTIPLE_SOCKETS_WITH_SAME_TOKEN');
  })()
    .catch(e => {
      console.log('五秒验证未通过');
      socket.send({ e: e.message });
      socket.disconnect(true);
    });
}

// 结束验证（完成）
function validateSeckillEnd(socket) {
  socket.send({ m: '本次活动已结束' });
  socket.disconnect(true);
}

// 接受秒杀请求
function onSubmitKill(io, socket) {
  const token = socket.token;
  const seckillid = socket.seckillid;
  if (!token || !seckillid) return;
  (async () => {
    // 1、减少token使用次数
    seckill(seckillid).decre_token_count(token);
    // 2、是否在抢票开始时间内，且ban抢先发请求的
    const difference = seckill(seckillid).start - Date.now();
    if (difference <= 0); // 开始后发起的请求 —— 接受
    else if (0 < difference && difference <= 4444) // 开始前合理时间发起的请求 —— 抛弃
      return 10;
    else if (4444 < difference) // 开始前 4444 ms 发起的请求 —— ban
      throw new Error('REQUEST_AHEAD_CHEATING_BLOCKED');
    // 3、调用处理抢票的情况
    const random = Math.floor(Math.random() * 10);
    return await redis.Seckill.fetchAward(seckillid, token, random)
  })()
    .then(award => {
      switch (award) {
        case 10: socket.emit('failure', 'notyet'); break;
        case 11: socket.emit('failure', 'awarded'); break;
        case 12: socket.emit('failure', 'finished'); break;
        case 13: socket.emit('failure', 'again'); break;
        default:
          const awardName = JSON.parse(award).name;
          socket.emit('succeed', awardName);
          seckill(seckillid).decre_rest();
      }
    })
    .catch(e => {
      // 作弊，就添加黑名单并归还奖品
      redis.Seckill.turnBackAward(seckillid, token)
        .then(award => {
          socket.send({ e: e.message });
          if (!award) {
            socket.disconnect(true);
            return;
          }
          const awardName = JSON.parse(award).name;
          socket.disconnect(true);
          socket.send({ m: '检测到你使用作弊手段获得秒杀奖品，已将[' + awardName + ']归还到奖品池，并禁止再次参与本次活动。' });
          seckill(seckillid).incre_rest();
          seckill(seckillid).emit('有一位小伙伴放弃了他的秒杀奖品，大家快来抢啊！')
        });
    });
}

// 连接终止
function onDisconnect(socket) {
  if (seckill(socket.seckillid))
    seckill(socket.seckillid).decre_online();
  clearTimeout(socket.checkMuti);
  clearTimeout(socket.checkAuth);
  clearTimeout(socket.seckillEnd);
}

const Seckill = {
  onAuth: onAuth,
  onSubmitKill: onSubmitKill,
  onDisconnect: onDisconnect,
  validate2seconds: validate2seconds,
  validate5seconds: validate5seconds,
  validateSeckillEnd: validateSeckillEnd
}

module.exports = Seckill;