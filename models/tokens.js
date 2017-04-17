const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const config = require('config-lite');

const tokenSchema = new Schema({
  token: { type: String },
  userid: { type: Schema.ObjectId, ref: 'User' },
  seckillid: { type: Schema.ObjectId, ref: 'Seckill' },
  content: { name: String, description: String, id: String },
  createdAt: { type: Date, default: Date.now() }//, expires: '3h' }
}, { versionKey: false });

const Token = mongoose.model('Token', tokenSchema);
module.exports = Token;