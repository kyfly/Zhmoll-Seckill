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
    this.last_click_set = {};     // 用于缓存用户上次发送请求时间的集合
    this.award_list = {};         // 用于缓存用户是否获奖的集合
    // 计算活动开始距现在时间差
    const time_difference = this.start_time - Date.now();
    // 活动结束工作 
    this.timer_finish = setTimeout(_finish, time_difference + config.finish_time, this);
    // 用于刷新本地缓存数据的计时器
    this.timer_data_refresher = setInterval(_refresh_data, config.refresh_data_rate, this);
  }
  // 抢票成功的信息发送
  succeed(socket, awardname) {
    return socket.emit('success', {
      r: this._rest,
      n: awardname
    });
  }
  // 抢票失败的信息发送
  fail(socket, type) {
    return socket.emit('failure', {
      r: this._rest,
      w: type
    });
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
  // 1min后数据持久化
  setTimeout((seckillid) => redis.Seckill.persistData(seckillid), 60 * 1000, seckillid);
  // 5min后销毁本地缓存
  setTimeout((seckillid) => {
    delete seckill_set[seckillid];
  }, 5 * 60 * 1000, seckillid);
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
      seckill._rest = results[0][1];// 奖品余量
      seckill._cheat = results[1][1];// 作弊人数
      seckill._cheat_award = results[2][1];// 作弊奖品被退回次数
      const award_tokens = results[3][1];// 获奖列表
      award_tokens.forEach(token => seckill.award_list[token] = true);
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
    logs.info('关闭同时进行的连接', { seckillid, token });
  }

  // 设置token的新socket
  const socketid = socket.id.split('#')[1];
  redis.TokenPool.set(seckillid, token, socketid);

  // 加入抢票广播房间，发送授时等信息
  socket.join(seckillid);
  seckill_set[seckillid].emit_to(socket);
  ++seckill_set[seckillid]._connect_count;
}

// 接受秒杀请求
function onSubmitKill(io, socket, click) {
  const token = socket.token;
  const seckillid = socket.seckillid;
  const seckill = seckill_set[seckillid];
  const now = Date.now();
  // 0、检查数据完整性
  if ((!token || !seckillid) && typeof click != 'number') {
    logs.info('秒杀数据不完整', { seckillid, token, click });
    return socket.disconnect(true);
  }
  // 1、检验用户请求发送频率，判断用户上次点击的次数是否符合要求
  seckill._click_count += click;
  if (seckill.last_click_set[token]
    && (now - seckill.last_click_set[token]) < config.speed_check) {
    // 如果请求发送过快，就抛弃
    return;
  }
  // 更新值
  seckill.last_click_set[token] = now;

  // 2、检验请求发送时间
  const time_difference = seckill.start_time - now;
  if (config.kill_ahead_time < time_difference) {
    // 开始前不合理时间发起的请求 —— 封号！
    return kill_cheat_handler(new Error('REQUEST_AHEAD_CHEATING_BLOCKED'),
      seckillid, token, socket);
  }
  if (0 < time_difference && time_difference <= config.kill_ahead_time) {
    // 开始前合理时间发起的请求 —— 返回活动尚未开始
    return seckill.fail(socket, 'notyet');
  }

  // 3、在本地缓存中检查是否已经获奖
  if (seckill.award_list[token] === true) {
    return seckill.fail(socket, 'awarded');
  }

  // 4、查看缓存中余量是否为零
  if (seckill._rest == 0) {
    return seckill.fail(socket, 'finished');
  }

  // 5、随机抛弃
  if (Math.random() < config.throw_rate) {
    // 如果随机数小于抛弃概率，就抛弃请求返回再试一次
    return seckill.fail(socket, 'again');
  }

  // 6、去数据库取奖品
  return redis.Seckill.fetchAward(seckillid, token)
    .then(msg => {
      switch (msg) {
        case 11: seckill.fail(socket, 'awarded'); break;
        case 12: seckill.fail(socket, 'finished'); break;
        case 20: seckill.fail(socket, 'cheated'); break;
        default:
          // 缓存
          seckill.award_list[token] = true;
          if (seckill._rest > 0) seckill._rest--;
          // 通知
          const award_name = JSON.parse(msg).name;
          seckill.succeed(socket, award_name);
          logs.info('抢到奖品', { seckillid, token, msg });
      }
    })
    .catch(e => logs.error(e, { seckillid, token }));
}

// 秒杀处理作弊信息
function kill_cheat_handler(e, seckillid, token, socket) {
  const seckill = seckill_set[seckillid];
  // 作弊，就添加黑名单并归还奖品
  return redis.Seckill.turnBackAward(seckillid, token, e.message)
    .then(award => {
      if (award) {
        const award_name = JSON.parse(award).name;
        seckill._rest++;
        seckill.broadcast('有一位小伙伴放弃了他的[' + award_name + ']，大家快来抢啊！');
        seckill.emit_to(socket, '你使用了作弊手段获取[' + award_name + ']，现将其归还到奖品池，并禁止再次参与本场活动。', e.message);
        seckill.award_list[token] = false;
        logs.info('作弊检测', { seckillid, token, reason: e.message, award });
      }
      else {
        seckill.emit_to(socket, '检测到你使用作弊手段，禁止参与本场活动。', e.message);
        logs.info('作弊检测', { seckillid, token, reason: e.message });
      }
    });
}

// 连接终止
function onDisconnect(socket) {
  clearTimeout(socket.checkMuti);
}

// 五秒验证
function validate5seconds(socket) {
  const token = socket.token;
  const seckillid = socket.seckillid;
  // 检查token与socket是否匹配
  redis.TokenPool.get(seckillid, token)
    .then(socketid_in_db => {
      const socketid = socket.id.split('#')[1];
      if (socketid_in_db != socketid) {
        logs.info('五秒验证未通过', { seckillid, token, socketid_in_db, socketid });
        seckill_set[seckillid].emit_to(socket, '你已在别处登录！');
        setTimeout(function (socket) { socket.disconnect(true); }, 1000, socket);
      }
    })
    .catch(e => logs.error(e, { seckillid, token }));
}

const Seckill = {
  handShake: handShake,
  onConnect: onConnect,
  onSubmitKill: onSubmitKill,
  onDisconnect: onDisconnect,
  validate5seconds: validate5seconds,
}

module.exports = Seckill;