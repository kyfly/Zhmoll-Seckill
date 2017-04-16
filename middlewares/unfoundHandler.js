const util = require('../lib/util');

module.exports = function (req, res, next) {
  res.json(util.reply(5000, '错误的路由请求'));
};