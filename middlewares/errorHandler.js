const util = require('../lib/util');

module.exports = function (err, req, res, next) {
  res.json(util.reply(6000, '服务器内部错误'));
};