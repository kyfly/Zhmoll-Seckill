var express = require('express');
var router = express.Router();

var User = require('../models/users');
var Reply = require('../models/replies');
var Token = require('../models/tokens');

var redis = require('../lib/redis');

// {
//   uid:'14051534',
//   name:'张效伟'
// }
router.post('/', function (req, res, next) {
  const credential = req.body;
  if (!credential.uid || !credential.name)
    return res.json(new Reply(false, 5001, '数据格式不正确！'));

  User.findOne({ uid: credential.uid }, function (err, user) {
    if (err)
      return next(err);
    if (!user)
      return res.json(new Reply(false, 4001, '学号/工号不正确！'));
    if (user.name != credential.name)
      return res.json(new Reply(false, 4002, '学号/工号与姓名不匹配！'));

    // 验证成功，credential换token，一个credential只能使一个token生效
    const token = Token.genToken();
    redis.hset('userToken', credential.uid, token, function (err, result) {
      if (err)
        return next(err);
      if (result == '0')
        return res.json(new Reply(true, 4000, '验证成功！', { token: token }));
    });
  });
});

module.exports = router;