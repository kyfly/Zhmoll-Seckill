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
    socketPreserveLimit: 1000 * 60 * 15,  // 最长秒杀开始后多少毫秒内socket断线
    cachePreserveLimit: 1000 * 60 * 20    // 最长秒杀开始后多少毫秒内cache断开引用
  }
};