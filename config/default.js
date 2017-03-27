module.exports = {
  mongodb: {
    url: 'mongodb://localhost/personel'
  },
  redis: {
    port: 6379,
    host: '127.0.0.1',
    family: 4
  },
  websocket: {
    serveClient: true
  },
  seckill: {
    checkLimit: 19,
    checkTime: 2000,
    allowLoginLeft: 30 * 60 * 1000,
    allowLoginRight: 15 * 60 * 1000,
    cachePreserveLimit: 30 * 60 * 1000,    // 最长秒杀开始后多少毫秒内cache断开引用
    persistAfterStart: 16 * 60 * 1000
  }
};