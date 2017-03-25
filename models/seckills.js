const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SeckillSchema = new Schema({
  title: { type: String },
  logoUrl: { type: String },
  description: { type: String, default: '手速快，你就是我的！' },
  detail: { type: String },
  createdAt: { type: Date },
  startAt: { type: Date },
  endAt: { type: Date },
  content: [{ name: String, description: String, limit: Number }],
  // enable后再把抢票写入数据库
  enable: { type: Boolean, default: false },
  activityId: { type: Schema.ObjectId }
}, { versionKey: false });

const Seckill = mongoose.model('Seckill', SeckillSchema);
module.exports = Seckill;