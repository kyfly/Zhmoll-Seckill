const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  uid: {
    type: Schema.Types.String,
    unique: true,
    index: true
  },
  name: Schema.Types.String,
}, { versionKey: false });

// 用户
// id: ObjectId
// uid: 学工号
// name: 姓名

const User = mongoose.model('User', UserSchema);
module.exports = User;