const redis = require('../lib/redis');
const Token = require('../models/tokens');

async function _checkBlocked(token) {
  const isBlocked = await redis.sismember('blackRoom', token);
  if (isBlocked)
    throw new Error('TOKEN_BLOCKED');
}

async function _checkValid(uid, token) {
  const result = await redis.sismember('tokenPool', token);
  if (result == 0) throw new Error('INVALID_TOKEN');
}

async function _getTokenCurrentSocketid(token) {
  return await redis.hget('socketUsingToken', token);
}

async function _removeTokenCurrentSocketid(token) {
  return await redis.hdel('socketUsingToken', token);
}

async function _setTokenCurrentSocketid(token, socketid) {
  await redis.hset('socketUsingToken', token, socketid);
}

async function findAndKick(io, socket, data) {
  const socketid = socket.id.split('#')[1];
  const uid = data.uid;
  const token = data.token;
  // 0、检查数据完整性
  if (!token || !uid)
    throw new Error('DATA_MISSING');

  // 1、并发任务
  const pList = [
    // 1.1、[并发]检测是否在黑名单里面
    _checkBlocked(token),
    // 1.2、[并发]检测Token是否合法
    _checkValid(uid, token),
    // 1.3、[并发]检查数据库同一token的socket
    _getTokenCurrentSocketid(token)
  ];
  const [s1, s2, socketid_in_db] = await Promise.all(pList);

  // 2、数据库同一token的socket存在就关闭它
  if (socketid_in_db && io.sockets.connected[socketid_in_db]) {
    io.sockets.connected[socketid_in_db].disconnect(true);
  }

  // 3、设置token的新socket
  await _setTokenCurrentSocketid(token, socketid);
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
        socket.emit('message', 'UNAUTHORIZED_SOCKET');
        socket.disconnect(true);
      }
    }, 2000);

    // 五秒验证：连接后每五秒检查一次是否同一个token开启了多socket，并关闭多余的socket
    socket.checkMutiSocket = setInterval(() => {
      (async () => {
        const socket_in_db = await _getTokenCurrentSocketid(socket.token);
        const socketid = socket.id.split('#')[1];
        if (socket_in_db != socketid)
          throw new Error('MUTIPLE_SOCKETS_WITH_SAME_TOKEN');
      })()
        .catch((e) => {
          console.log('五秒验证未通过');
          socket.emit('message', e.message);
          socket.disconnect(true);
        });
    }, 5000);

    // 连接认证：并关闭之前该token打开的socket，且授时
    socket.on('auth', function (data) {
      findAndKick(io, socket, data)
        .then(() => {
          socket.emit('time', new Date());
          socket.token = data.token;
        })
        .catch((e) => {
          console.log('连接认证未通过');
          socket.emit('message', e.message);
          socket.disconnect(true);
        });
    });

    socket.on('disconnect', function () {
      clearInterval(socket.checkMutiSocket);
      clearTimeout(socket.checkAuthSocket);
    });

    // 抢票按钮按下
    // 1、抢票逻辑检查是否在黑名单中，如果是就什么也不干，如果不是就进行下一步
    // 2、寻找对应Seckill Id的哈希表
    socket.on('submitkill', function () {
      if (!socket.token) return;
      if (!socket.isKilled) {
        // 重连会影响这个结果
        socket.isKilled = true;
        socket.emit('message', '抢到了');
        return;
      }
      socket.emit('message', '抢过了');
      return;
    });
  });
};