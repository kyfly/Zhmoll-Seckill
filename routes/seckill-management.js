const express = require('express');
const router = express.Router();
const Reply = require('../models/replies');
const Seckill = require('../models/seckills');

async function addNewSeckill(data) {
  const seckillItem = new Seckill();
  seckillItem.createdAt = Date.now();
}

// router.use('/management',checkAdmin);

// post /api/management/seckill
router.post('/', (req, res, next) => {
  const data = req.body;
  const seckill = new Seckill();

  seckill.title = data.title;
  seckill.logoUrl = data.logoUrl;
  seckill.description = data.description;
  seckill.detail = data.detail;
  seckill.startAt = data.startAt;
  seckill.endAt = data.endAt;
  seckill.content = data.content;
  seckill.activityId = data.activityId;

  seckill.save((err, result) => {
    if (err) return next(err);
    if (result)
      return res.send(new Reply(true, 4502, '创建该秒杀成功', result));
  });
});

// 寻找id对应的seckill中间件
// * /management/seckill/:seckillId
router.use('/:seckillId', (req, res, next) => {
  const seckillId = req.params.seckillId;
  (async () => {
    const seckill = await Seckill.findById(seckillId);
    if (!seckill)
      throw new Error({ code: 4501, message: '找不到该秒杀' });
  })()
    .then(seckill => {
      res.locals.seckill = seckill;
      return next();
    })
    .catch(e => {
      return next(e);
    });
});

// 创建者获取中间件
// get /management/seckill/:seckillId
router.get('/:seckillId', (req, res, next) => {
  const seckill = res.locals.seckill;
  return res.send(new Reply(true, 4500, '获取秒杀成功', seckill));
});

// 创建者修改中间件
// put /management/seckill/:seckillId
router.put('/:seckillId', (req, res, next) => {
  const seckill = res.locals.seckill;
  const data = req.body;

  seckill.title = data.title || seckill.title;
  seckill.logoUrl = data.logoUrl || seckill.logoUrl;
  seckill.description = data.description || seckill.description;
  seckill.detail = data.detail || seckill.detail;
  seckill.startAt = data.startAt || seckill.startAt;
  seckill.endAt = data.endAt || seckill.endAt;
  seckill.content = data.content || seckill.content;
  seckill.enable = data.enable || seckill.enable;

  seckill.save((err, result) => {
    if (err) return next(err);
    if (result)
      return res.send(new Reply(true, 4503, '修改该秒杀成功', seckill));
  });
});

module.exports = router;