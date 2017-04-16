// 废弃

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SeckillResultSchema = new Schema({
  userid: { type: Schema.ObjectId },
  seckillid: { type: Schema.ObjectId },
  content: { name: String, description: String, id: String }
}, { versionKey: false });

// 一次秒杀活动后的结果
// id: ObjectId
// userid: 用户id
// seckillid: 秒杀活动id
// content: 获得秒杀活动奖品的id

const SeckillResult = mongoose.model('SeckillResult', SeckillResultSchema);
module.exports = SeckillResult;