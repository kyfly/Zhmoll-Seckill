'use strict'
const redis = require('./redis');
const config = require('config-lite');

// seckill集合糖
function seckill(seckillid) {
  return seckill_cache_set[seckillid];
}
// seckill集合
const seckill_cache_set = {};

// seckill项
class seckill_cache {
  constructor(seckillid, startTime, io) {
    // 初始化数据
    this._seckillid = seckillid;
    this._io = io;
    this._online = 0;
    this._rest = 0;
    this._connect_count = 0;
    this._click_count = 0;
    // 秒杀活动开始时间
    this.start = startTime;
    // 用于缓存反作弊单位时间内token点击次数的数值的集合
    this.token_count_set = {};
    // 从缓存数据库中读取奖品余量
    redis.Seckill.countRestAward(seckillid).then(count => this._rest = count);
    // 用于单位时间内刷新token点击次数的函数
    this.token_count_set_refresh = setInterval(_refresh_click_count, config.seckill.checkTime, this);
    // 计算活动开始距现在时间差
    const countdown = this.start - Date.now();
    // 用于持久化数据
    this.persist = setTimeout(_persist, countdown + config.seckill.persistAfterStart, this);
    // 活动允许时间右界关闭连接
    this.closeConnections = setTimeout(_closeConnections, countdown + config.seckill.allowLoginRight, this);
    // 用于销毁本次秒杀活动的缓存
    this.destory = setTimeout(_destory, countdown + config.seckill.cachePreserveLimit, this);
  }

  // 针对某用户发送信息
  emit_to(socket, msg, errmsg) {
    _refresh_data(this);
    socket.emit('message', { t: Date.now(), h: this._online, r: this._rest, m: msg, e: errmsg });
  }

  // 广播信息
  emit(msg, errmsg) {
    _refresh_data(this);
    this._io.of('/seckill').to(this._seckillid)
      .emit('message', { h: this._online, r: this._rest, m: msg, e: errmsg });
  }

  // 减少用户能够点击的次数
  decre_token_count(token) {
    if (this.token_count_set[token] === undefined) {
      // 不存在就建立
      this.token_count_set[token] = config.seckill.checkLimit;
    }
    const count = --this.token_count_set[token];
    // 秒杀活动缓存
    ++this._click_count;
    if (count < 0)
      throw new Error('CONCURRENCY_CHEATING_BLOCKED');
  }
}

function _persist(seckill) {
  redis.Seckill.persist(seckill._seckillid);
}

// 到期删除引用
function _destory(seckill) {
  clearInterval(seckill.token_count_set_refresh);
  delete seckill.token_count_set_refresh;
  delete seckill.token_count_set;
  delete seckill_cache_set[seckill._seckillid];
}

// 恢复点击次数，每过一定时间进行广播
function _refresh_click_count(seckill) {
  const set = seckill.token_count_set;
  Object.getOwnPropertyNames(set).forEach((val, idx, array) => {
    set[val] = config.seckill.checkLimit;
  });
  seckill.emit();
}

// 更新数据
function _refresh_data(seckill) {
  // 用在线连接数替代在线人数
  seckill._online = Object.getOwnPropertyNames(seckill._io.of('/seckill').connected).length;
  // 用数据库的奖品余量更新余量信息
  redis.Seckill.countRestAward(seckill._seckillid).then(count => (seckill._rest = count));
  redis.Seckill.plusArgsSeckill(seckill._seckillid,
    {
      connectCount: seckill._connect_count,
      clickCount: seckill._click_count,
    });
  seckill._connect_count = 0;
  seckill._click_count = 0;
}

// 检查seckillid是否存在，并实现缓存建立
async function _checkSockillidExisted(seckillid, io) {
  if (seckill(seckillid)) {
    return;
  }
  else {
    const startTime = await redis.Seckill.whenStart(seckillid);
    if (!startTime)
      throw new Error('SECKILLID_INVALID');
    const countdown = startTime - Date.now();
    if (countdown + config.seckill.allowLoginRight < 0)
      throw new Error('SECKILL_FINISHED');
    seckill_cache_set[seckillid] = new seckill_cache(seckillid, startTime, io);
  }
}

// 服务器在活动结束时主动关闭连接
function _closeConnections(seckill) {
  const connections = seckill._io.of('/seckill').connected;
  const socketids = Object.getOwnPropertyNames(connections);
  const seckillid = seckill._seckillid;
  seckill.emit('本次活动已结束');
  socketids.forEach(socketid => {
    if (connections[socketid].rooms && connections[socketid].rooms[seckillid]) {
      connections[socketid].disconnect(true);
    }
  });
}

// // 检查Token是否被ban（完成）（废弃）
// async function _checkTokenBlocked(token) {
//   const isBlocked = await redis.BlackRoom.exist(token);
//   if (isBlocked == 1)
//     throw new Error('CHEAT_TOKEN_FORBIDDEN');
// }

// // 检查Token有效性（完成）（废弃）
// async function _checkTokenValid(seckillid, token) {
//   const result = await redis.TokenPool.exist(seckillid, token);
//   if (result == 0)
//     throw new Error('TOKEN_INVALID');
// }

// 握手认证（完成）
function handShake(request, cb) {
  const seckillid = request._query.seckillid;
  const token = request._query.token;
  // 0、检验数据完整性
  if (!seckillid || !token) {
    console.error('握手认证数据不完整');
    return cb('PARAMS_REQUIRED', false); // 数据不完整
  }
  // 1、检验seckillid是否存在、token是否存在，并且都存在的话拿到socketid_in_db
  redis.TokenPool.get(seckillid, token).then(socketid_in_db => {
    if (!socketid_in_db) {
      console.error(seckillid, token, 'seckillid或Token不存在');
      return cb('TOKEN_INVALID', false);
    }
    // 2、检测是否在黑名单里面
    redis.BlackRoom.exist(seckillid, token).then(isBlocked => {
      if (isBlocked === 1) {
        console.error(seckillid, token, '尝试连接封禁的Token');
        return cb(new Error('CHEAT_TOKEN_FORBIDDEN'), false)//'CHEAT_TOKEN_FORBIDDEN', false);
      }
      request._query.socketid_in_db = socketid_in_db;
      cb(null, true);
    });
  });
}

// 连接事件
function onConnect(io, socket) {
  const token = socket.token = socket.request._query.token;
  const seckillid = socket.seckillid = socket.request._query.seckillid;

  // 数据库同一token的socket存在就关闭它
  const socketid_in_db = socket.request._query.socketid_in_db;
  if (io.sockets.connected[socketid_in_db]) {
    console.info(seckillid, token, '关闭同时进行的Websocket连接');
    seckill(seckillid).emit_to(socket, '你已在别处登录！');
    io.sockets.connected[socketid_in_db].disconnect(true);
  }

  // 设置token的新socket
  const socketid = socket.id.split('#')[1];
  redis.TokenPool.set(seckillid, token, socketid);

  // 检查时间是否允许
  _checkSockillidExisted(seckillid, io)
    .then(() => {
      // 加入抢票广播房间
      socket.join(seckillid);
      seckill(seckillid).emit_to(socket);
      ++seckill(seckillid)._connect_count;
    })
    .catch(e => {
      console.error(seckillid, token, '连接后缓存建立产生错误');
      seckill(seckillid).emit_to(socket, '连接后缓存建立产生错误', e.message);
      socket.disconnect(true);
    });

  // // 添加活动结束断连倒计时
  // const countdown = seckill(socket.seckillid).start - Date.now() + config.seckill.allowLoginRight;
  // socket.seckillEnd = setTimeout(validateSeckillEnd, countdown, socket);
}

// // 连接认证（完成）（废弃）
// function onAuth(io, socket, data) {
//   (async () => {
//     const socketid = socket.id.split('#')[1];
//     const seckillid = data.seckillid;
//     const token = data.token;
//     // 0、检查数据完整性
//     if (!data || !token || !seckillid)
//       throw new Error('DATA_MISSING');
//     // 1、并发任务 todo pipeline化
//     const pList = [
//       // 1.1、[并发]获取数据库同一token的socket
//       redis.TokenPool.get(seckillid, token),
//       // 1.2、[并发]检测是否在黑名单里面
//       _checkTokenBlocked(token),
//       // 1.3、[并发]检测Token是否合法
//       _checkTokenValid(seckillid, token),
//       // 1.4、[并发]检测seckillid是否存在及时间可用性
//       _checkSockillidExisted(seckillid, io)
//     ];
//     const [socketid_in_db] = await Promise.all(pList);
//     // 2、数据库同一token的socket存在就关闭它
//     if (socketid_in_db && io.sockets.connected[socketid_in_db])
//       io.sockets.connected[socketid_in_db].disconnect(true);
//     // 3、设置token的新socket
//     await redis.SocketTokenTable.set(token, socketid);
//   })()
//     .then(() => {
//       socket.token = data.token;
//       socket.seckillid = data.seckillid;
//       // 取消两秒认证
//       clearTimeout(socket.checkAuth);
//       // 设置token反作弊限制次数
//       seckill(socket.seckillid).token_count_set[socket.token] = config.seckill.checkLimit;
//       // 加入抢票广播房间
//       socket.join(socket.seckillid);
//       seckill(socket.seckillid).emit_to(socket);
//       // 添加活动结束断连倒计时
//       const countdown = seckill(socket.seckillid).start - Date.now() + config.seckill.allowLoginRight;
//       socket.seckillEnd = setTimeout(validateSeckillEnd, countdown, socket);
//     })
//     .catch(e => {
//       console.error(new Date(), data.seckillid, '连接认证未通过');
//       seckill(seckillid).emit_to(socket, '连接认证未通过', e.message);
//       socket.disconnect(true);
//     });
// }

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
    if (difference <= 0) {
      // 开始后发起的请求 —— 接受
    }
    else if (0 < difference && difference <= 4444) {
      // 开始前合理时间发起的请求 —— 抛弃
      return 10;
    }
    else if (4444 < difference) {
      // 开始前 4444 ms 发起的请求 —— ban
      throw new Error('REQUEST_AHEAD_CHEATING_BLOCKED');
    }

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
        case 20: break;
        default:
          const awardName = JSON.parse(award).name;
          socket.emit('succeed', awardName);
      }
    })
    .catch(e => {
      // 作弊，就添加黑名单并归还奖品
      redis.BlackRoom.add(seckillid, token, e.message).then();
      redis.Seckill.turnBackAward(seckillid, token)
        .then(award => {
          if (award) {
            const awardName = JSON.parse(award).name;
            seckill(seckillid).emit('有一位小伙伴放弃了他的秒杀奖品，大家快来抢啊！');
            seckill(seckillid).emit_to(socket,
              '检测到你使用作弊手段获得秒杀奖品，已将[' + awardName + ']归还到奖品池，并禁止再次参与本次活动。', e.message);
          }
          else {
            seckill(seckillid).emit_to(socket, '检测到你使用作弊手段，禁止再次参与本次活动。', e.message);
          }
          console.error(socket.seckillid, socket.token, '作弊检测未通过', e.message);
          socket.disconnect(true);
        })
        .catch(e => {
          console.error(e);
        });
    });
}

// 连接终止
function onDisconnect(socket) {
  clearTimeout(socket.checkMuti);
}

// // 两秒验证（完成）（废弃）
// function validate2seconds(socket) {
//   if (!socket.token) {
//     console.error(new Date(), socket.seckillid, '两秒验证未通过');
//     seckill(seckillid).emit_to(socket, '两秒验证未通过', 'UNAUTHORIZED_SOCKET');
//     socket.disconnect(true);
//   }
// }

// 五秒验证
function validate5seconds(socket) {
  const token = socket.token;
  const seckillid = socket.seckillid;
  (async () => {
    if (!socket.token)
      throw new Error('UNAUTHORIZED_SOCKET_BY_MUTICHECK');
    // 1、检查token的socket
    const socketid_in_db = await redis.TokenPool.get(seckillid, token);
    const socketid = socket.id.split('#')[1];
    // 2、检查token的socket是否不匹配，不匹配即为同一个token开了多个socket
    if (socketid_in_db != socketid) {
      seckill(seckillid).emit_to(socket, '你已在别处登录！');
      throw new Error('MUTIPLE_SOCKETS_WITH_SAME_TOKEN');
    }
  })()
    .catch(e => {
      console.error(seckillid, '五秒验证未通过', token);
      seckill(seckillid).emit_to(socket, undefined, e.message);
      socket.disconnect(true);
    });
}

// // 结束验证（完成）(废弃)
// function validateSeckillEnd(socket) {
//   seckill(seckillid).emit_to(socket, '本次活动已结束');
//   socket.disconnect(true);
// }

const Seckill = {
  handShake: handShake,
  // onAuth: onAuth,
  onConnect: onConnect,
  onSubmitKill: onSubmitKill,
  onDisconnect: onDisconnect,
  // validate2seconds: validate2seconds,
  validate5seconds: validate5seconds,
  // validateSeckillEnd: validateSeckillEnd,
}

module.exports = Seckill;