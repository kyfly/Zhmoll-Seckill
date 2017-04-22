module.exports = {
  port: 80,
  mongodb: {
    url: 'mongodb://seckill:seckill-zhmoll@localhost/seckill-beta'
  },
  websocket: {
    serveClient: false
  },
  seckill: {
    limit_rate: 9,
    limit_time: 1000,

    kill_ahead_time: 3333,
    login_start: 30 * 60 * 1000,
    login_end: 5 * 60 * 1000,
    finish_time: 5 * 60 * 1000,
    refresh_data_rate: 1500,
    download_award_list: 7 * 60 * 1000,
    speed_check: 100,
    throw_rate: 0.95
  }
};