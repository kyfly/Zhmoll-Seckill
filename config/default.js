module.exports = {
  token: {
    maxAge: 60 * 60 * 1
  },
  mongodb: {
    url: 'mongodb://localhost/personel'
  },
  redis: {
    port: 6379,
    host: '127.0.0.1',
    family: 4
  },
  websocket: {
    serveClient: true
  }
};