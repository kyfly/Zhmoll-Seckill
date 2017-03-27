const redis = require('../lib/redis');

// async function addAward() {
//   redis.Seckill.addSeckill('test',Date.now());
//   for (let i = 0; i < 3; i++) {
//     await redis.Seckill.putAward('test', { name: '十佳歌手决赛VIP座门票', description: '坐上vip座，走上人生巅峰', id: 'zhmoll_vip#' + i });
//   }
//   for (let i = 0; i < 5; i++) {
//     await redis.Seckill.putAward('test', { name: '十佳歌手决赛普通座门票', description: '普通的disco我们普通的摇～', id: 'zhmoll_comm#' + i });
//   }
//   for (let i = 0; i < 10; i++) {
//     await redis.Seckill.putAward('test', { name: '十佳歌手决赛站票', description: '啊这也要票？', id: 'zhmoll_stand#' + i });
//   }
//   const len = await redis.Seckill.countRestAward('test');
//   return len;
// }

// app.get('/api/add', function (req, res, next) {
//   addAward().then(function (len) {
//     res.end('ok:' + len);
//   });
// })

module.exports = function (app) {
  app.use('/api/seckill/', require('./seckill'));
  app.use('/api/seckill-management', require('./seckill-management'));
};