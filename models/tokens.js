const config = require('config-lite');
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
  userid: { type: Schema.ObjectId },
  seckillid: { type: Schema.ObjectId },
  createdAt: { type: Date, default: Date.now(), expires: '3h' }
}, { versionKey: false });

tokenSchema.statics.fetch = function (userid, seckillid) {
  return new Promise(async (resolve, reject) => {
    // 1、寻找当前id和seckillid是否有token存在
    const token = await this.findOne({ userid: userid, seckillid: seckillid });
    if (token) return resolve(token.token);
    // 2、没有的话就生成一个返回
    const newTokenStr = _gen();
    await this.create({ token: newTokenStr, userid: userid, seckillid: seckillid });
    // 3、将token放到redis的token池里面
    await redis.TokenPool.add(seckillid, newTokenStr);
    return resolve(newTokenStr);
  });
};

const Token = mongoose.model('Token', tokenSchema);
module.exports = Token;