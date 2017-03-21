var config = require('config-lite');
var mongoose = require('mongoose');
mongoose.Promise = Promise;
var connection = mongoose.connect(config.mongodb.url);