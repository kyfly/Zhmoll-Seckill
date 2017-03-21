const option = require('config-lite').websocket;

const redis = require('../lib/redis');
const Seckill = require('./seckill');

module.exports = function (app) {
  const io = require('socket.io')(app, option);

  io.of('seckillId').on('connection', function (socket) {
    socket.emit('welcome', '服务器已连接');

    // 建立连接后三秒内未获得认证信息就关掉连接
    setTimeout(function () {
      if (!socket.token) {
        socket.disconnect(true);
        console.log('不正确的连接');
      }
    }, 3000);

    // 认证并同步授时
    socket.on('auth', function (data) {

      Seckill.checkAuth(data)
      .then()
      .catch((e)=>{

      });


      const uid = data.uid;
      const token = data.token;



    });

    // 抢票按钮按下
    // 1、抢票逻辑检查是否在黑名单中，如果是就什么也不干，如果不是就进行下一步
    // 2、寻找对应Seckill Id的哈希表
    socket.on('kill', function () {
      socket.send('抢到了');
    });
  });
};