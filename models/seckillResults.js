const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SeckillResultSchema = new Schema({
  uid: { type: Schema.ObjectId },
  seckillId: { type: Schema.ObjectId },
  content: [{ name: String, description: String }]
}, { versionKey: false });

const SeckillResult = mongoose.model('SeckillResult', SeckillResultSchema);
module.exports = SeckillResult;