const redis = require('./redis');

// 检查seckillid是否存在
async function _checkSockillidExist(seckillid) {
  const result = await redis.Seckill.exist(seckillid);
  if (result == 0) throw new Error('SECKILLID_INVALID');
}

// 检查Token是否被ban（完成）
async function _checkTokenBlocked(token) {
  const isBlocked = await redis.BlackRoom.exist(token);
  if (isBlocked == 1) throw new Error('CHEAT_TOKEN_BLOCKED');
}

// 检查Token有效性（完成）
async function _checkTokenValid(token) {
  const result = await redis.TokenPool.exist(token);
  if (result == 0) throw new Error('TOKEN_INVALID');
}

// 减少Token的使用次数（完成）
async function _decreTokenCount(token) {
  const result = await redis.TokenPool.decrement(token);
  if (result < 0) throw new Error('ON_CHEATING_TOKEN_BLOCKED');
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
    // 1、并发任务
    // todo pipeline化
    const pList = [
      // 1.1、[并发]获取数据库同一token的socket
      redis.SocketTokenTable.get(token),
      // 1.2、[并发]检测是否在黑名单里面
      _checkTokenBlocked(token),
      // 1.3、[并发]检测Token是否合法
      _checkTokenValid(token),
      // 1.4、[并发]检测seckillid是否存在
      _checkSockillidExist(seckillid)
    ];
    const [socketid_in_db] = await Promise.all(pList);
    // 2、数据库同一token的socket存在就关闭它
    if (socketid_in_db && io.sockets.connected[socketid_in_db])
      io.sockets.connected[socketid_in_db].disconnect(true);
    // 3、设置token的新socket
    await redis.SocketTokenTable.set(token, socketid);
  })()
    .then(() => {
      // 授时
      socket.emit('time', Date.now());
      socket.token = data.token;
      socket.seckillid = data.seckillid;
      socket.join(socket.seckillid);
      // 取消两秒认证
      clearTimeout(socket.checkAuth);
      return redis.Seckill.whenStart(socket.seckillid);
    })
    .then(start => {
      // 添加活动结束
      countdown = start - Date.now() + 15 * 60 * 1000;
      socket.countdown = setTimeout(validateSeckillEnd, countdown, socket);
    })
    .catch(e => {
      console.log('连接认证未通过');
      socket.emit('message', e.message);
      socket.disconnect(true);
    });
}

// 两秒验证（完成）
function validate2seconds(socket) {
  if (!socket.token) {
    console.log('两秒验证未通过');
    socket.volatile.emit('message', 'UNAUTHORIZED_SOCKET');
    socket.disconnect(true);
  }
}

// 五秒验证（完成）
function validate5seconds(socket) {
  (async () => {
    const pList = [
      // 1、[并发]检查token的socket
      redis.SocketTokenTable.get(socket.token),
      // 1、[并发]去token池里恢复token使用次数
      redis.TokenPool.add(socket.token),
    ];
    const [socket_in_db] = await Promise.all(pList);
    const socketid = socket.id.split('#')[1];
    // 2、检查token的socket是否不匹配，不匹配即为同一个token开了多个socket
    if (socket_in_db != socketid)
      throw new Error('MUTIPLE_SOCKETS_WITH_SAME_TOKEN');
  })()
    .catch(e => {
      console.log('五秒验证未通过');
      socket.volatile.emit('message', e.message);
      socket.disconnect(true);
    });
}

// 结束验证（完成）
function validateSeckillEnd(socket) {
  socket.emit('message', '本次活动已结束');
  socket.disconnect(true);
}

// 接受秒杀请求
function onSubmitKill(io, socket) {
  const token = socket.token;
  const seckillid = socket.seckillid;
  if (!token || !seckillid) return;

  // 怎么判断已经抢到票了？读写不一致问题？
  (async () => {
    // 1、减少token使用次数
    await _decreTokenCount(token);

    // 2、是否在抢票开始时间内，且ban抢先发请求的
    const start = await redis.Seckill.whenStart(seckillid);
    const difference = start - Date.now();
    if (difference <= 0) {
      ;
      // 开始后发起的请求 —— 接受
    }
    else if (0 < difference && difference <= 5555) {
      // 开始前合理时间发起的请求 —— 抛弃
      return;
    }
    else if (5555 < difference) {
      // 开始前 5555 ms 发起的请求 —— ban
      throw new Error('SECKILL_NOT_START_CHEATING_BLOCKED');
    }

    // 3、随机丢弃本次请求
    if (Math.random() < 0.6)
      return;

    // 4、检查是否已经抢到票，抢到了就丢弃本次请求
    return await redis.Seckill.fetchAward(seckillid, token);
  })()
    .then(award => {
      if (!award)
        return socket.emit('seckillAgain');
      if (award == 1)
        return socket.emit('message', '你已经抢过了！')
      if (award == 0)
        return socket.emit('seckillFail')
      return socket.emit('seckillSucceed', award.name);
    })
    .catch(e => {
      // 作弊了？把抢到的奖品还回去！

      // 添加黑名单
      redis.BlackRoom.add(socket.token);
      redis.Seckill.turnBackAward(seckillid, token).then(function (result) {
        
        socket.emit('message', '请不要作弊！已将你所抢到的[' + JSON.parse(result).name + ']归还！');
        socket.emit('message', e.message);
        socket.disconnect(true);
      }).catch(e=>{
        console.log(e)
      });
    });
}

// 连接终止
function onDisconnect(socket) {
  clearInterval(socket.checkMuti);
  clearTimeout(socket.checkAuth);
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