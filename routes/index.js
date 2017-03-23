module.exports = function (app) {
  app.use('/api/login', require('./login'));
};