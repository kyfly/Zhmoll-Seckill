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
     *    [message]    服务器发送消息
     *     { type, name, content }
     *    [sync]       服务器同步数据，授时、在线人数、奖品余量等
     *     { t:授时, h:在线人数, r:奖品余量, c:作弊人数, b:作弊奖品返还数, m:管理员公告 }
     *    [failure]    抢失败了
     *     { r:奖品余量, w:失败原因( notyet / awarded / finished / again ) }
     *    [success]    成功抢到
     *     { r:奖品余量, n:奖品名称 }
     */
    Seckill.onConnect(io, socket);
    // 五秒验证：连接后五秒检查一次是否同一个token开启了多socket，并关闭多余的socket
    socket.checkMuti = setTimeout(Seckill.validate5seconds, 5000, socket);
    // 抢票按钮按下
    socket.on('submitkill', (click) => Seckill.onSubmitKill(io, socket, click));
    // 连接终止
    socket.on('disconnect', () => Seckill.onDisconnect(socket));
  });
}; 