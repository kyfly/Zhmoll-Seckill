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
    serveClient: false
  },
  seckill: {
    kill_ahead_time: 2222,
    limit_rate: 9,
    limit_time: 1000,
    login_start: 30 * 60 * 1000,
    login_end: 500 * 60 * 1000,
    finish_time: 600 * 60 * 1000,
    refresh_data_rate: 1500,             // 刷新数据频率
    download_award_list: 6 * 60 * 1000
  },
  auth: {
    name: 'zhmoll',
    pass: '05738526'
  }
};