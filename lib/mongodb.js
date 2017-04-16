const config = require('config-lite');
const mongoose = require('mongoose');
mongoose.Promise = Promise;
const connection = mongoose.connect(config.mongodb.url);

require('../models/users');
require('../models/seckills');
require('../models/tokens');
// require('../models/seckillResults');