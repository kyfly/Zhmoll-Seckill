const config = require('config-lite').token;
const redis = require('../lib/redis');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

function _gen(len) {
  len = len || 40;
  const charset = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
  const maxPos = charset.length;
  let result = '';
  for (i = 0; i < len; i++)
    result += charset.charAt(Math.floor(Math.random() * maxPos));
  return result;
}

const tokenSchema = new Schema({
  token: { type: String, unique: true },
  uid: { type: String, unique: true },
  createdAt: { type: String, default: Date.now(), expires: config.maxAge }
}, { versionKey: false });

tokenSchema.statics.getByUserid = function (userid) {
  return new Promise(async (resolve, reject) => {
    // 1、寻找当前id是否有token存在
    const token = await this.findOne({ uid: userid });
    if (token) return resolve(token.token);
    // 2、没有的话就生成一个返回
    const newTokenStr = _gen();
    const newToken = await this.create({ token: newTokenStr, uid: userid });
    // 3、将token放到redis的token池里面
    await redis.TokenPool.add(newTokenStr);
    return resolve(newTokenStr);
  });
};

const Token = mongoose.model('Token', tokenSchema);
module.exports = Token;