const basicAuth = require('basic-auth');
const config = require('config-lite').auth;

function unauthorized(res) {
  // 认证框要求输入用户名和密码的提示语
  res.set('www-Authenticate', 'Basic realm=Input User&Password');
  return res.sendStatus(401);
}

function auth(req, res, next) {
  const user = basicAuth(req);
  if (!user || !user.name || !user.pass) {
    return unauthorized(res);
  }
  if (user.name === config.name && user.pass === config.pass) {
    return next();
  }
  else {
    return unauthorized(res);
  }
};

module.exports = auth;