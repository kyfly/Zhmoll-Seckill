const redis = require('../lib/redis');
const Token = require('../models/tokens');

// 检查Token是否被ban
async function _checkTokenBlocked(token) {
  const isBlocked = await redis.BlackRoom.exist(token);
  if (isBlocked == 1) throw new Error('TOKEN_BLOCKED');
}

// 检查Token有效性
async function _checkTokenValid(uid, token) {
  const result = await redis.TokenPool.exist(token);
  if (result == 0) throw new Error('INVALID_TOKEN');
}

// 减少Token的使用次数
async function _decreTokenCount(token) {
  const result = await redis.TokenPool.decrement(token);
  if (result < 0) throw new Error('TOO_MUCH_REQUEST_BLOCKED');
}

// 连接认证
async function connectionAuth(io, socket, data) {
  const socketid = socket.id.split('#')[1];
  const uid = data.uid;
  const token = data.token;
  // 0、检查数据完整性
  if (!token || !uid)
    throw new Error('DATA_MISSING');

  // 1、并发任务
  const pList = [
    // 1.1、[并发]检测是否在黑名单里面
    _checkTokenBlocked(token),
    // 1.2、[并发]检测Token是否合法
    _checkTokenValid(uid, token),
    // 1.3、[并发]获取数据库同一token的socket
    redis.SocketTokenTable.get(token)
  ];
  const [s1, s2, socketid_in_db] = await Promise.all(pList);

  // 2、数据库同一token的socket存在就关闭它
  if (socketid_in_db && io.sockets.connected[socketid_in_db])
    io.sockets.connected[socketid_in_db].disconnect(true);

  // 3、设置token的新socket
  await redis.SocketTokenTable.set(token, socketid);
  return;
}

module.exports = function (app) {
  const io = require('socket.io')(app, require('config-lite').websocket);

  io.of('/seckillId').on('connection', function (socket) {
    // 发送欢迎信息
    socket.emit('welcome');

    // 两秒验证：连接后两秒内检查是否验证，并关闭未验证socket
    socket.checkAuthSocket = setTimeout(() => {
      if (!socket.token) {
        console.log('两秒验证未通过');
        socket.volatile.emit('message', 'UNAUTHORIZED_SOCKET');
        socket.disconnect(true);
      }
    }, 2000);

    // 五秒验证：连接后每五秒检查一次是否同一个token开启了多socket，并关闭多余的socket
    socket.checkMutiSocket = setInterval(() => {
      (async () => {
        const pList = [
          // 1、[并发]检查token的socket
          redis.SocketTokenTable.get(socket.token),
          // 1、[并发]去token池里恢复token次数
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
    }, 5000);

    // 连接认证：并关闭之前该token打开的socket，且授时
    socket.on('auth', function (data) {
      connectionAuth(io, socket, data)
        .then(() => {
          socket.emit('time', new Date());
          socket.token = data.token;
          clearTimeout(socket.checkAuthSocket);
        })
        .catch(e => {
          console.log('连接认证未通过');
          socket.emit('message', e.message);
          socket.disconnect(true);
        });
    });

    socket.on('disconnect', function () {
      clearInterval(socket.checkMutiSocket);
      clearTimeout(socket.checkAuthSocket);
    });

    // 余量变化广播、获奖广播

    // 抢票按钮按下
    // todo 连接前发出的请求在连接建立后瞬间都发出了，处理方案。
    socket.on('submitkill', function (data) {
      const token = socket.token;
      if (!socket.token) return;

      // 怎么判断已经抢到票了？读写不一致问题？
      (async () => {
        // 1、减少token使用次数
        await _decreTokenCount(token);
        // 2、检查是否已经抢到票，抢到了就丢弃本次请求
        // todo
        // 3、随机丢弃本次请求
        if (Math.random() < 0.6) return;
        // 4、从奖品池里面拿奖品
        return await redis.lpop('awardForZhmoll');
      })()
        .then(award => {
          if (award) {
            socket.award = JSON.parse(award);
            return socket.emit('result', socket.award.name);
          }
        })
        .catch(e => {
          // 作弊了？把抢到的奖品还回去！
          // todo
          // redis.rpush('awardForZhmoll', JSON.stringify(socket.award));
          // 添加黑名单
          redis.BlackRoom.add(socket.token);
          // socket.emit('message', '请不要作弊！已将你所抢到的[' + socket.award.name + ']归还！');
          socket.emit('message', e.message);
          socket.disconnect(true);
        });
    });
  });
}; 