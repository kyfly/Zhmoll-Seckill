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
    limit_rate: 9,
    limit_time: 1000,

    kill_ahead_time: 2222,
    login_start: 30 * 60 * 1000,
    login_end: 500 * 60 * 1000,
    finish_time: 600 * 60 * 1000,
    refresh_data_rate: 1000,             // 刷新数据频率
    download_award_list: 7 * 60 * 1000,
    speed_check: 100,
    throw_rate: 0.95
  },
  auth: {
    name: 'zhmoll',
    pass: '05738526'
  }
};