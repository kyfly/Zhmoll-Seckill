const router = require('express').Router();
const User = require('../models/users');
const Seckill = require('../models/seckills');
const Token = require('../models/tokens');
const util = require('../lib/util');
const config = require('config-lite');

// 首页 
// get /api/seckill
router.get('/', (req, res, next) => {
  Seckill
    .find({ enable: true, isDeleted: false })
    .limit(20)
    .select('id title logoUrl description startAt')
    .sort('-startAt')
    .exec((err, seckills) => {
      if (err) res.json(util.reply(err));
      return res.json(util.reply(4100, '获取首页成功', seckills));
    });
});

// 查找指定秒杀活动
// * /api/seckill/:seckillid
router.use('/:seckillid', (req, res, next) => {
  const seckillid = req.params.seckillid;
  const Schema = require('mongoose').Schema;
  Seckill
    .findOne({ id: Schema.ObjectId(seckillid), enable: true, isDeleted: false })
    .select('-isDeleted -enable')
    .exec((err, seckill) => {
      if (err) res.json(util.reply(err));
      if (!seckill)
        return res.json(util.reply(4102, '找不到该秒杀活动'));
      res.locals.seckill = seckill;
      next();
    });
});

router.get('/:seckillid', (req, res, next) => {
  const seckill = res.locals.seckill;
  return res.json(util.reply(4101, '获取秒杀活动成功', seckill));
})

// 参加指定秒杀活动
// post /api/seckill/:seckillid/join
router.post('/:seckillid/join', (req, res, next) => {
  const seckill = res.locals.seckill;
  const credential = req.body;
  (async () => {
    // 1、检查数据格式是否合法
    if (!credential || !credential.uid || !credential.name)
      throw util.standardError(5001, '数据格式不正确！');

    // 2、检查学号和姓名是否符合要求、匹配
    const user = await User.findOne({ uid: credential.uid });
    if (!user)
      throw util.standardError(4001, '学号/工号不正确！');
    if (user.name != credential.name)
      throw util.standardError(4002, '学号/工号与姓名不匹配！');

    // 3、检查时间是否符合要求
    const countdown = seckill.startAt.getTime() - Date.now();
    if (countdown > config.seckill.allowLoginLeft)
      throw util.standardError(4003, '请在活动开始前30分钟内加入');
    else if (countdown < -config.seckill.allowLoginRight)
      throw util.standardError(4004, '活动已结束');

    // 4、返回Token
    return await Token.fetch(user.id, seckill.id);
  })()
    .then(token => res.json(util.reply(4000, '验证成功！', { token: token })))
    .catch(e => res.json(util.reply(e)));
});

module.exports = router;