const router = require('express').Router();

const User = require('../models/users');
const Reply = require('../models/replies');
const Token = require('../models/tokens');

async function checkCredential(credential) {
  // 1、检查数据格式是否合法
  if (!credential || !credential.uid || !credential.name)
    throw new Error({ code: 5001, isSuccessful: false, message: '数据格式不正确！' });
  // 2、检查学号和姓名是否符合要求、匹配
  const user = await User.findOne({ uid: credential.uid });
  if (!user)
    throw new Error({ code: 4001, isSuccessful: false, message: '学号/工号不正确！' });
  if (user.name != credential.name)
    throw new Error({ code: 4002, isSuccessful: false, message: '学号/工号与姓名不匹配！' });
  // 3、返回Token
  const token = await Token.getByUserid(credential.uid);
  return token;
}

// {
//   uid:'14051534',
//   name:'张效伟'
// }
router.post('/', function (req, res, next) {
  const credential = req.body;

  checkCredential(credential)
    .then((token) => {
      return res.json(new Reply(true, 4000, '验证成功！', { token: token }));
    })
    .catch((e) => {
      return res.json(new Reply(e));
    });
});

module.exports = router;