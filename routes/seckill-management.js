const router = require('express').Router();
const User = require('../models/users');
const Seckill = require('../models/seckills');
const SeckillResult = require('../models/seckillResults');
const redis = require('../lib/redis');
const util = require('../lib/util');
const config = require('config-lite');

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
  if (seckill.enable)
    return res.json(util.reply(4507, '该秒杀已启用'));
  const countdown = seckill.startAt - Date.now();
  // if (countdown < 60 * 60 * 1000)
  //   return res.json(util.reply(4506, '请将秒杀启用时间设置为至少一小时以后！'));

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
      return res.json(util.reply(4504, '启用该秒杀成功'));
  });
});

// 创建者删除秒杀活动
// delete /api/seckill-management/:seckillid
router.delete('/:seckillid', (req, res, next) => {
  const seckill = res.locals.seckill;
  if (seckill.enable)
    return res.json(util.reply(4507, '秒杀活动已启用，无法删除！'));
  seckill.isDeleted = true;
  seckill.save((err, result) => {
    if (err) return res.json(util.reply(err));
    if (result)
      return res.json(util.reply(4505, '删除该秒杀成功'));
  });
});

module.exports = router;

// 创建者获得秒杀活动获奖名单
// get /api/seckill-management/:seckillid/awardlist
router.get('/:seckillid/awardlist', (req, res, next) => {
  const seckill = res.locals.seckill;
  if (!seckill.enable)
    return res.json(util.reply(4601, '秒杀活动尚未启用！'));
  const countdown = seckill.startAt - Date.now();
  if (countdown > -config.seckill.downloadAwardlist)
    return res.json(util.reply(4602, '请在秒杀活动开始20分钟后再获取获奖列表'));

  const xlsx = require('node-xlsx');
  const consequnce = [];
  consequnce.push(['用户id', '学工号', '姓名', '奖品id', '奖品名称', '奖品描述']);
  (async () => {
    results = await SeckillResult
      .where('seckillid').equals(seckill.id).select('userid content description');
    for (let item of results) {
      await (async () => {
        const userid = String(item.userid);
        const awardname = item.content.name;
        const awardid = item.content.id;
        const awarddescription = item.content.description;
        user = await User.findById(userid, 'uid name');
        const uid = user.uid;
        const username = user.name;
        consequnce.push([userid, uid, username, awardid, awardname, awarddescription]);
      })();
    }
  })()
    .then(() => {
      const buffer = xlsx.build([{ name: seckill.title + '_结果', data: consequnce }]);
      const filename = 'consequnce.xlsx'//encodeURIComponent(seckill.title + '_结果.xlsx');
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment;filename=' + filename);
      return res.end(buffer);
    })
    .catch(e => {
      return res.json(util.reply(e));
    });
});