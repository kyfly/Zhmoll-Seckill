const redis = require('../lib/redis');
const Token = require('../models/tokens');

async function _checkBlocked(token) {
  const isBlocked = await redis.sismember('blackroom', token);
  if (isBlocked)
    throw new Error('TOKEN_BLOCKED');
}

async function _checkValid(uid, token) {
  const token_in_db = (await Token.findOne({ uid: uid })).token;
  if (!token_in_db || token_in_db != token)
    throw new Error('INVALID_TOKEN');
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
  // 1、检测是否在黑名单里面
  await _checkBlocked(token);
  // 2、检测Token是否合法
  await _checkValid(uid, token);
  // 3、检查数据库并关闭同一token的socket
  const socketid_in_db = await _getTokenCurrentSocketid(token);
  if (socketid_in_db && io.sockets.connected.socketid_in_db) {
    io.sockets.connected.socketid_in_db.disconnect(true);
  }
  // 4、设置token的新socket
  await _setTokenCurrentSocketid(token, socketid);
  return;
}

module.exports = function (app) {
  const io = require('socket.io')(app, require('config-lite').websocket);

  io.of('/seckillId').on('connection', function (socket) {
    socket.emit('welcome', '服务器已连接');

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

    // 认证并关闭之前该token打开的socket
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
    });

    // 抢票按钮按下
    // 1、抢票逻辑检查是否在黑名单中，如果是就什么也不干，如果不是就进行下一步
    // 2、寻找对应Seckill Id的哈希表
    // socket.on('kill', function () {
    //   socket.send('抢到了');
    // });
  });
};