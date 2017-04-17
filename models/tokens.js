const config = require('config-lite');
const redis = require('../lib/redis');
const mongoose = require('mongoose');
const util = require('../lib/util');
const Schema = mongoose.Schema;

const tokenSchema = new Schema({
  token: { type: String },
  userid: { type: Schema.ObjectId, ref: 'User' },
  seckillid: { type: Schema.ObjectId, ref: 'Seckill' },
  content: { name: String, description: String, id: String },
  createdAt: { type: Date, default: Date.now() }//, expires: '3h' }
}, { versionKey: false });

tokenSchema.statics.fetch = function (userid, seckillid) {
  return new Promise(async (resolve, reject) => {
    // 1、寻找当前id和seckillid是否有token存在
    const token = await this.findOne({ userid: userid, seckillid: seckillid });
    if (token) return resolve(token.token);
    // 2、没有的话就生成一个返回
    const newTokenStr = util.genToken();
    await this.create({ token: newTokenStr, userid: userid, seckillid: seckillid });
    // 3、将token放到redis的token池里面
    await redis.TokenPool.add(seckillid, newTokenStr);
    return resolve(newTokenStr);
  });
};

const Token = mongoose.model('Token', tokenSchema);
module.exports = Token;