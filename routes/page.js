'use strict';
const express = require('express');
const router = express.Router();
const path = require('path');
const Seckill = require('../models/seckills');
const util = require('../lib/util');

function getSeckillById(req, res, next) {
  const seckillid = req.params.seckillid;
  Seckill
    .findById(seckillid)
    .exec((err, seckill) => {
      if (err || !seckill || seckill.isHidden || !seckill.enable || seckill.isDeleted)
        return res.status(404).end();
      next();
    });
}

router.use('/:seckillid',
  getSeckillById,
  express.static(path.join(__dirname, '../public'))
);

module.exports = router;