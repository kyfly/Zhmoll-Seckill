module.exports = {
  port: 80,
  mongodb: {
    url: 'mongodb://seckill:seckill-zhmoll@localhost/seckill-beta'
  },
  websocket: {
    serveClient: false
  },
  seckill: {
    checkLimit: 18,
    checkTime: 2000,
    allowLoginLeft: 30 * 60 * 1000,
    allowLoginRight: 10 * 60 * 1000,
    cachePreserveLimit: 16 * 60 * 1000,    // 最长秒杀开始后多少毫秒内cache断开引用
    persistAfterStart: 12 * 60 * 1000,
    downloadAwardlist: 15 * 60 * 1000
  }
};