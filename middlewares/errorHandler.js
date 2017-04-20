const util = require('../lib/util');
const logs = util.logs;

module.exports = function (err, req, res, next) {
  logs.error(err, req.body);
  res.json(util.reply(6000, '服务器内部错误'));
};