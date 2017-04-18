module.exports = {
  port: 3030,
  mongodb: {
    url: 'mongodb://seckill:seckill-zhmoll@localhost/seckill-beta'
  },
  websocket: {
    serveClient: true
  },
  seckill: {
    checkLimit: 18,
    checkTime: 2000,
    allowLoginLeft: 30 * 60 * 1000,
    allowLoginRight: 15 * 60 * 1000,
    cachePreserveLimit: 20 * 60 * 1000,    // 最长秒杀开始后多少毫秒内cache断开引用
    persistAfterStart: 16 * 60 * 1000,
    downloadAwardlist: 20 * 60 * 1000
  }
};