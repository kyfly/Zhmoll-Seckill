const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const router = require('./routes');
const unfoundHandler = require('./middlewares/unfoundHandler');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
// app.use(require('./middlewares/cors'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

router(app);

app.use(unfoundHandler);
app.use(errorHandler);

module.exports = app;