




function checkAuth(data) {
  const uid = data.uid;
  const token = data.token;

  return new Promise((resolve, reject) => {
    if (!uid || !token) return reject();
    return resolve();
  })
    .then(() => redis.sismember('blackroom', uid))
    .then((isBlocked) => {
      return new Promise((resolve, reject) => {
        return isBlocked == 1 ? reject() : resolve();
      });
    })
    .then(() => redis.hget('userToken', uid))
    .then((foundedToken) => {
      // console.log(foundedToken)
      // if (foundedToken != token) {
      //   return socket.disconnect(true);
      // }
      // socket.token = foundedToken;
      // socket.emit('time', Date.now());
      return new Promise((resolve, reject) => {
        return foundedToken == token ? resolve() : reject()
      });
    });
}