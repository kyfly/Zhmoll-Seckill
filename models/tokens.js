const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const config = require('config-lite');

const tokenSchema = new Schema({
  token: { type: String, index: true },
  userid: { type: Schema.ObjectId, ref: 'User', index: true },
  seckillid: { type: Schema.ObjectId, ref: 'Seckill', index: true },
  content: { name: String, description: String, id: String },
  createdAt: { type: Date, default: Date.now() },
  blocked: { type: Boolean, default: false },
  blockReason: { type: String }
}, { versionKey: false });

const Token = mongoose.model('Token', tokenSchema);
module.exports = Token;