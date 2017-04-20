const util = require('../lib/util');

module.exports = function (req, res, next) {
  res.json(util.reply(5000, '访问的页面不存在～'));
};