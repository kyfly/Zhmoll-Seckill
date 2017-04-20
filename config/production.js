module.exports = {
  port: 80,
  mongodb: {
    url: 'mongodb://seckill:seckill-zhmoll@localhost/seckill-beta'
  },
  websocket: {
    serveClient: false
  },
  seckill: {
    kill_ahead_time: 4444,
    limit_rate: 9,
    limit_time: 1000,
    login_start: 30 * 60 * 1000,
    login_end: 5 * 60 * 1000,
    finish_time: 5 * 60 * 1000,
    refresh_data_rate: 1500,             // 刷新数据频率
    download_award_list: 6 * 60 * 1000
  }
};