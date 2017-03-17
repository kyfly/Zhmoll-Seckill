var express = require('express');
var logger = require('morgan');
var bodyParser = require('body-parser');
var path = require('path');
var router = require('./routes');
var unfoundHandler = require('./middlewares/unfoundHandler');
var errorHandler = require('./middlewares/errorHandler');

var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

router(app);

app.use(unfoundHandler);
app.use(errorHandler);

module.exports = app;