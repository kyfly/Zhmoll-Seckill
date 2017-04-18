'use strict';
const express = require('express');
const router = express.Router();
const path = require('path');
const Seckill = require('../models/seckills');

function getSeckillById(req, res, next) {
  const seckillid = req.params.seckillid;

  Seckill
    .findOne({ _id: seckillid, enable: true, isDeleted: false })
    .select('-isDeleted -enable')
    .exec((err, seckill) => {
      if (err) res.json(util.reply(err));
      if (!seckill) return res.status(404).end();
      // req.seckill = seckill;
      next();
    });
}

router.use('/:seckillid',
  getSeckillById,
  express.static(path.join(__dirname, '../public'))
);
// router.get('/:seckillid', (req, res, next) => {

//   res.sendFile(path.join(__dirname, '../public/index.html'));
// });

module.exports = router;