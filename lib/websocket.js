const redis = require('./redis');
const Seckill = require('./seckill');
const options = require('config-lite').websocket;
options.allowRequest = Seckill.handShake;

module.exports = function (app) {
  const io = require('socket.io')(app, options);
  io.of('/seckill').on('connection', function (socket) {
    /* 
     *    服务器接受事件：
     *    [submitkill]
     *    
     *    服务器发出事件：
     *    [message]服务器发送消息，授时、人数和剩余变化
     *    [failure]抢失败了 + notyet / awarded / finished / again
     *    [succeed]成功抢到 + name
     */
    Seckill.onConnect(io, socket);
    // 五秒验证：连接后五秒检查一次是否同一个token开启了多socket，并关闭多余的socket
    socket.checkMuti = setTimeout(Seckill.validate5seconds, 5000, socket);
    // 抢票按钮按下
    socket.on('submitkill', () => Seckill.onSubmitKill(io, socket));
    // 连接终止
    socket.on('disconnect', () => Seckill.onDisconnect(socket));
  });
}; 