const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SeckillSchema = new Schema({
  title: { type: String, required: true },
  logoUrl: { type: String },
  description: { type: String },
  detail: { type: String },
  createdAt: { type: Date },
  startAt: { type: Date },
  content: [{ name: String, description: String, limit: Number }],
  enable: { type: Boolean, default: false },
  isShowed: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  consequence: {
    finishTime: Date,
    clickCount: Number,
    attendCount: Number,
    connectCount: Number,
    loginCount: Number,
    turnBackCount: Number
  }
}, { versionKey: false });

// 一次秒杀活动
// id: ObjectId
// title: 秒杀标题
// logoUrl: Logo的图片url
// descritpion: 本秒杀活动的简要描述
// detail: 本秒杀活动的详细描述
// createdAt: 秒杀创建时间
// startAt: 秒杀开始时间
// content: 秒杀奖品内容及数量
// enable: 是否启用该秒杀，启用了才能在主页上看见

const Seckill = mongoose.model('Seckill', SeckillSchema);
module.exports = Seckill;