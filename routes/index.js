'use strict';
const redis = require('../lib/redis');

module.exports = function (app) {
  app.use('/seckill', require('./page'));
  app.use('/api/seckill', require('./seckill'));
  app.use('/api/seckill-management', require('./seckill-management'));
};