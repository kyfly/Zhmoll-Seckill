module.exports = {
  port: 3000,
  mongodb: {
    url: 'mongodb://localhost/seckill-beta'
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
    checkLimit: 18,
    checkTime: 2000,
    allowLoginLeft: 300000 * 60 * 1000,
    allowLoginRight: 150000 * 60 * 1000,
    cachePreserveLimit: 300000 * 60 * 1000,    // 最长秒杀开始后多少毫秒内cache断开引用
    persistAfterStart: 160000 * 60 * 1000,
    downloadAwardlist: 200000 * 60 * 1000
  },
  auth: {
    name: 'zhmoll',
    pass: '05738526'
  }
};