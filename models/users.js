var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  uid: {
    type: Schema.Types.Number,
    unique: true,
    index: true
  },
  name: Schema.Types.String,
});

var User = mongoose.model('User', UserSchema);
module.exports = User;