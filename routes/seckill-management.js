const router = require('express').Router();
const Seckill = require('../models/seckills');
const redis = require('../lib/redis');
const util = require('../lib/util');

function _gen(len) {
  len = len || 15;
  const charset = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
  const maxPos = charset.length;
  let result = '';
  for (i = 0; i < len; i++)
    result += charset.charAt(Math.floor(Math.random() * maxPos));
  return result;
}

// 创建者新建一个秒杀活动
// post /api/seckill-management
router.post('/', (req, res, next) => {
  const data = req.body;
  const seckill = new Seckill();
  seckill.title = data.title;
  seckill.logoUrl = data.logoUrl;
  seckill.description = data.description;
  seckill.detail = data.detail;
  seckill.startAt = data.startAt;
  seckill.content = data.content;

  seckill.save((err, result) => {
    if (err) return res.json(util.reply(err));
    if (result)
      return res.send(util.reply(4502, '创建该秒杀成功', result));
  });
});

// 寻找id对应的seckill中间件
// * /api/seckill-management/:seckillid
router.use('/:seckillid', (req, res, next) => {
  const seckillid = req.params.seckillid;
  (async () => {
    const seckill = await Seckill.findById(seckillid);
    if (!seckill || seckill.isDeleted)
      throw util.standardError(4501, '找不到该秒杀');
    return seckill
  })()
    .then(seckill => {
      res.locals.seckill = seckill;
      return next();
    })
    .catch(e => res.json(util.reply(e)));
});

// 创建者获取中间件
// get /api/seckill-management/:seckillid
router.get('/:seckillid', (req, res, next) => {
  const seckill = res.locals.seckill;
  return res.send(util.reply(4500, '获取秒杀活动成功', seckill));
});

// 创建者修改中间件
// put /api/seckill-management/:seckillid
router.put('/:seckillid', (req, res, next) => {
  const data = req.body;
  const seckill = res.locals.seckill;
  seckill.title = data.title || seckill.title;
  seckill.logoUrl = data.logoUrl || seckill.logoUrl;
  seckill.description = data.description || seckill.description;
  seckill.detail = data.detail || seckill.detail;
  seckill.startAt = data.startAt || seckill.startAt;
  seckill.content = data.content || seckill.content;

  seckill.save((err, result) => {
    if (err) return res.json(util.reply(err));
    if (result)
      return res.json(util.reply(4503, '修改该秒杀成功', seckill));
  });
});

// 创建者启用秒杀
// get /api/seckill-management/:seckillid/enable
router.get('/:seckillid/enable', (req, res, next) => {
  const seckill = res.locals.seckill;
  seckill.enable = true;

  redis.Seckill.addSeckill(seckill.id, seckill.startAt.getTime()).then();
  seckill.content.forEach(item => {
    const award = {};
    award.name = item.name;
    award.description = item.description;
    for (let i = 0; i < item.limit; i++) {
      award.id = _gen();
      redis.Seckill.putAward(seckill.id, award).then();
    }
  });
  seckill.save((err, result) => {
    if (err) return res.json(util.reply(err));
    if (result)
      return res.json(util.reply(4504, '启用该秒杀成功', seckill));
  });
});

// 创建者删除秒杀活动
// delete /api/seckill-management/:seckillid
router.delete('/:seckillid', (req, res, next) => {
  const seckill = res.locals.seckill;
  seckill.isDeleted = true;
  seckill.save((err, result) => {
    if (err) return res.json(util.reply(err));
    if (result)
      return res.json(util.reply(4505, '删除该秒杀成功'));
  });
});

module.exports = router;