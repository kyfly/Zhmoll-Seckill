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

const User = mongoose.model('User', UserSchema);
module.exports = User;