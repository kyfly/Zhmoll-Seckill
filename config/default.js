module.exports = {
  token:{
    expire: 1000
  },
  mongodb: {
    url: 'mongodb://localhost/personel'
  },
  redis:{
    port:6379,
    host:'127.0.0.1',
    family:4,
    //password:'auth',
    //db:0
  },
  websocket:{
    serveClient: true
  }
};