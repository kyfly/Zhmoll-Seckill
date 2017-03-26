const redis = require('./redis');
const Seckill = require('./seckill');

module.exports = function (app) {
  const io = require('socket.io')(app, require('config-lite').websocket);

  io.of('/seckill').on('connection', function (socket) {
    /* 
     *    服务器接受事件：
     *    [auth]、[submitkill]
     *    
     *    服务器发出事件：
     *    [message]服务器发送消息，授时、人数和剩余变化
     *    [failure]抢失败了
     *    [succeed]成功抢到 + name
     *    
     * 
     */
    // 发送欢迎信息
    socket.emit('welcome');
    // 两秒验证：连接后两秒内检查是否验证，并关闭未验证socket
    socket.checkAuth = setTimeout(Seckill.validate2seconds, 2000, socket);
    // 五秒验证：连接后五秒检查一次是否同一个token开启了多socket，并关闭多余的socket
    socket.checkMuti = setTimeout(Seckill.validate5seconds, 5000, socket);
    // 连接认证：并关闭之前该token打开的socket，且授时
    socket.on('auth', data => Seckill.onAuth(io, socket, data));
    // 抢票按钮按下
    socket.on('submitkill', () => Seckill.onSubmitKill(io, socket));
    // 连接终止
    socket.on('disconnect', () => Seckill.onDisconnect(socket));
    // 余量变化广播、获奖广播、同时在线人数广播
  });
}; 