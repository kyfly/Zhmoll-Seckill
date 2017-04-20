'use strict'
const redis = require('./redis');
const config = require('config-lite').seckill;
const logs = require('./util').logs;

// 本地缓存 - 本实例的缓存
// redis缓存 - 存放在redis数据库的缓存
// 数据持久 - mongodb数据持久化

// seckill集合
// 通过seckill_set[seckillid]访问缓存
const seckill_set = {};

// seckill项
// 一个seckill项保存了一次秒杀活动的缓存
class Seckill_item {
  constructor(seckillid, startTime, io) {
    // 初始化数据
    this.io = io;                 // Socket.io 对象引用
    this.id = seckillid;          // seckillid
    this.start_time = startTime;  // 秒杀活动开始时间缓存
    // 广播的实时数据
    this._online = 0;             // 活动在线人数 - 定时更新
    this._rest = 0;               // 奖品余量缓存 - 定时更新
    this._cheat = 0;              // 检测到的作弊人数
    this._cheat_award = 0;        // 检测到的作弊奖品返还数
    // 秒杀活动需要采集和分析的数据
    this._connect_count = 0;      // 单位检测时间内连接增加数 - 定时添加 - 单位时间清零
    this._click_count = 0;        // 单位检测时间内点击增加数 - 定时添加 - 单位时间清零
    this._max_online = 0;         // 最大同时在线人数
    // 计算活动开始距现在时间差
    const time_difference = this.start_time - Date.now();
    // 活动结束工作 
    this.timer_finish = setTimeout(_finish, time_difference + config.finish_time, this);
    // 用于刷新本地缓存数据的计时器
    this.timer_data_refresher = setInterval(_refresh_data, config.refresh_data_rate, this);
    // 用于缓存反作弊单位时间内token点击次数的数值的集合
    this.token_submit_countdown = {};
    // 用于单位时间内刷新token点击次数的函数
    this.timer_token_submit_countdown_refresher = setInterval(_refresh_submit_countdown, config.limit_time, this);
  }
  // 减少用户能够点击的次数
  decrement_token_submit_countdown(token) {
    ++this._click_count;
    if (this.token_submit_countdown[token] === undefined) {
      this.token_submit_countdown[token] = config.limit_rate;
    }
    const count = --this.token_submit_countdown[token];
    // 秒杀活动缓存
    if (count < 0)
      throw new Error('CONCURRENCY_CHEATING_BLOCKED');
  }
  // 针对某用户发送信息
  emit_to(socket, msg, errmsg) {
    // 拿到msg发msg，拿到errmsg发errmsg，不拿不发
    socket.emit('message',
      {
        t: Date.now(),      // 服务器授时
        h: this._online,    // 同一秒杀活动在线人数
        r: this._rest,      // 仅作显示用途的剩余奖品数缓存
        m: msg,             // 给用户发送的消息
        e: errmsg           // 给用户发送的错误
        //c: this._cheat == 0 ? undefined : this._cheat,     // 检测到的作弊人数
        //b: this._cheat_award == 0 ? undefined : this._cheat_award // 检测到的作弊奖品返还数
      });
  }
  // 广播信息
  broadcast(msg, errmsg) {
    this.io.of('/seckill').volatile.to(this.id)
      .emit('message',
      {
        t: Math.random() < 0.3 ? Date.now() : undefined,
        h: this._online,
        r: this._rest,
        m: msg,
        e: errmsg
        //c: this._cheat == 0 ? undefined : this._cheat,     // 检测到的作弊人数
        //b: this._cheat_award == 0 ? undefined : this._cheat_award // 检测到的作弊奖品返还数
      });
  }
}

// 秒杀活动结束
function _finish(seckill) {
  // 关闭token_count的恢复机制
  clearInterval(seckill.timer_token_submit_countdown_refresher);
  const seckillid = seckill.id;
  const connections = seckill.io.of('/seckill').connected;
  const socketids = Object.getOwnPropertyNames(connections);
  // 广播结束通知
  seckill.broadcast('本次活动已结束');

  // 关闭连接
  setTimeout((seckill) => {
    socketids.forEach(socketid => {
      const socket = connections[socketid];
      if (socket.rooms && socket.rooms[seckillid])
        socket.disconnect(true);
    });
  }, 5 * 1000, seckill);
  // 15s后数据持久化
  setTimeout((seckillid) => redis.Seckill.persistData(seckillid), 15 * 1000, seckillid);
  // 5min后销毁本地缓存
  setTimeout((seckillid) => {
    delete seckill_set[seckillid];
  }, 5 * 60 * 1000, seckillid);
}

// 恢复点击次数
function _refresh_submit_countdown(seckill) {
  const set = seckill.token_submit_countdown;
  Object.getOwnPropertyNames(set).forEach((token) => {
    if (set[token] < 0) return;
    set[token] = config.limit_rate;
  });
}

// 刷新数据
function _refresh_data(seckill) {
  // 将_click_count、_connect_count 加入数据库后，清零
  const seckillid = seckill.id;
  const update = {
    click_count: seckill._click_count,      // 单位时间内新增点击次数
    connect_count: seckill._connect_count,  // 单位时间内新增连接建立数
    max_online: seckill._max_online         // 最大同时在线人数
  };
  seckill._click_count = 0;
  seckill._connect_count = 0;
  // 更新数据
  redis.Seckill.refreshData(seckillid, update)
    .then(results => {
      seckill._rest = results[0][1]// 奖品余量
      seckill._cheat = results[1][1]// 作弊人数
      seckill._cheat_award = results[2][1]// 作弊奖品被退回次数
      seckill.broadcast();
    })
    .catch(e => logs.error(e));

  // 获得实时在线人数
  seckill.io.of('/seckill').in(seckillid).clients((err, clients) => {
    if (err) return logs.error(err);
    // 更新同时在线人数
    seckill._online = clients.length;
    // 更新最大同时在线人数
    if (seckill._max_online < clients.length)
      seckill._max_online = clients.length;
  });
}

// 握手认证
function handShake(request, cb) {
  const seckillid = request._query.seckillid;
  const token = request._query.token;
  // 检验数据完整性
  if (!seckillid || !token) {
    logs.error('握手数据不完整', { seckillid, token });
    return cb('PARAMS_REQUIRED', false);
  }
  // 检验   seckillid是否存在、
  //        seckillid的活动时间是否允许登录、
  //        token是否存在、
  //        token是否在黑名单中，
  //        并且都存在的话拿到socketid_in_db
  redis.handShakeCheck(seckillid, token)
    .then(results => {
      // 返回 results => [[null, socketid_in_db], [null, 0], [null, startAt]]
      const socketid_in_db = results[0][1];
      const isBlocked = results[1][1];
      const startAt = results[2][1];
      const now = Date.now();
      if (!startAt) {
        // seckillid 不存在
        logs.info('找不到seckillid', { seckillid, token });
        return cb('INVALID_SECKILLID', false);
      }
      if (startAt - now > config.login_start || now - startAt > config.login_end) {
        // 不在登录允许的时间范围内
        logs.info('不在允许的时间范围', { seckillid, token });
        return cb('INVALID_JOIN_TIME', false);
      }
      if (!socketid_in_db) {
        // token 不存在
        logs.info('找不到token', { seckillid, token });
        return cb('INVALID_TOKEN', false);
      }
      if (isBlocked === 1) {
        // 在黑名单中
        logs.info('尝试连接被封的token', { seckillid, token });
        return cb('FORBIDDEN_TOKEN', false);
      }
      request._query.socketid_in_db = socketid_in_db;
      request._query.startAt = startAt;
      return cb(null, true);
    })
    .catch(e => {
      logs.error(e);
      return cb(e.message, false);
    });
}

// 连接事件
function onConnect(io, socket) {
  const token = socket.token = socket.request._query.token;
  const seckillid = socket.seckillid = socket.request._query.seckillid;
  const startAt = socket.request._query.startAt;
  const socketid_in_db = socket.request._query.socketid_in_db;

  // 若活动本地缓存未建立则建立缓存
  if (!seckill_set[seckillid])
    seckill_set[seckillid] = new Seckill_item(seckillid, startAt, io);

  // 数据库同一token的socket存在就关闭它
  if (io.sockets.connected[socketid_in_db]) {
    setTimeout(function (socket) { socket.disconnect(true); }, 1000, io.sockets.connected[socketid_in_db]);
    logs.info('关闭同时的连接', { seckillid, token });
    seckill_set[seckillid].emit_to(io.sockets.connected[socketid_in_db], '你已在别处登录！');
  }

  // 设置token的新socket
  const socketid = socket.id.split('#')[1];
  redis.TokenPool.set(seckillid, token, socketid);

  // 加入抢票广播房间，发送授时等信息
  socket.join(seckillid);
  seckill_set[seckillid].emit_to(socket);
  ++seckill_set[seckillid]._connect_count;
}

// 秒杀处理事件
async function _kill(seckillid, token) {
  const seckill = seckill_set[seckillid];
  // 减少token使用次数
  seckill.decrement_token_submit_countdown(token);
  // 判断抢票时间
  const time_difference = seckill.start_time - Date.now();
  if (time_difference <= 0) {
    // 开始后发起的请求 —— 接受
    return await redis.Seckill.fetchAward(seckillid, token);
  }
  else if (0 < time_difference && time_difference <= config.kill_ahead_time) {
    // 开始前合理时间发起的请求 —— 抛弃
    return 10;
  }
  else if (config.kill_ahead_time < time_difference) {
    // 开始前不合理时间发起的请求 —— 封号！
    throw new Error('REQUEST_AHEAD_CHEATING_BLOCKED');
  }
}

// 秒杀处理返回信息
function _kill_msg(msg, seckillid, token, socket) {
  switch (msg) {
    case 10: socket.emit('failure', 'notyet'); break;
    case 11: socket.emit('failure', 'awarded'); break;
    case 12: socket.emit('failure', 'finished'); break;
    case 13: socket.emit('failure', 'again'); break;
    case 20: socket.emit('failure', 'cheated'); break;
    default:
      logs.info('抢到奖品', { seckillid, token, msg });
      const award_name = JSON.parse(msg).name;
      socket.emit('succeed', award_name);
  }
}

// 秒杀处理作弊信息
function _kill_cheat_msg(e, seckillid, token, socket) {
  // 作弊，就添加黑名单并归还奖品 todo
  // redis.BlackRoom.add(seckillid, token, e.message).then();
  redis.Seckill.turnBackAward(seckillid, token, e.message)
    .then(award => {
      const seckill = seckill_set[seckillid];
      if (award) {
        const award_name = JSON.parse(award).name;
        seckill.broadcast('有一位小伙伴放弃了他的[' + award_name + ']，大家快来抢啊！');
        seckill.emit_to(socket, '你使用了作弊手段获取[' + award_name + ']，现将其归还到奖品池，并禁止再次参与本场活动。', e.message);
        logs.info('作弊检测', { seckillid, token, reason: e.message, award });
      }
      else {
        seckill.emit_to(socket, '检测到你使用作弊手段，禁止再次参与本场活动。', e.message);
        logs.info('作弊检测', { seckillid, token, reason: e.message });
      }
      // 15s秒后断连
      setTimeout(function (socket) { socket.disconnect(true); }, 15000, socket);
    })
    .catch(e => logs.error(e, { seckillid, token }));
}

// 接受秒杀请求
function onSubmitKill(io, socket) {
  const token = socket.token;
  const seckillid = socket.seckillid;
  // 检查数据完整性
  if (!token || !seckillid)
    return socket.disconnect(true);
  // 发起kill
  _kill(seckillid, token)
    .then(msg => _kill_msg(msg, seckillid, token, socket))      // 正常请求
    .catch(e => _kill_cheat_msg(e, seckillid, token, socket))  // 作弊请求
    .catch(e => logs.error(e))
}

// 连接终止
function onDisconnect(socket) {
  clearTimeout(socket.checkMuti);
}

// 五秒验证辅助函数
async function _validate(socket) {
  const token = socket.token;
  const seckillid = socket.seckillid;
  // 检查数据是否完整
  if (!token || !seckillid)
    throw new Error('UNAUTHORIZED_SOCKET_BY_MUTICHECK');
  // 检查token与socket是否匹配
  const socketid_in_db = await redis.TokenPool.get(seckillid, token);
  const socketid = socket.id.split('#')[1];
  if (socketid_in_db != socketid)
    throw new Error('MUTIPLE_SOCKETS_WITH_SAME_TOKEN');
}

// 五秒验证
function validate5seconds(socket) {
  return _validate(socket).catch(e => {
    logs.info('五秒验证未通过', { socket: token, socket: seckillid });
    seckill_set[seckillid].emit_to(socket, '你已在别处登录！', e.message);
    setTimeout(function (socket) { socket.disconnect(true); }, 1000, socket);
  });
}

const Seckill = {
  handShake: handShake,
  onConnect: onConnect,
  onSubmitKill: onSubmitKill,
  onDisconnect: onDisconnect,
  validate5seconds: validate5seconds,
}

module.exports = Seckill;