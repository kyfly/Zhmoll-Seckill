document.onload = function () {

}

var socket = io('/' + 'seckillId', {
  reconnectionAttempts: 3,
  autoConnect: false
});

socket.on('connect', function () {
  socket.emit('auth', { uid: '14051534', token: 'ZfjzXyX73GG58FfxJ44cASrdXFiAYPGArQsM4XJE' });
});

socket.on('welcome', function (data) {
  document
    .getElementById('receiver')
    .innerHTML += '<p> 第一次连接：' + data + '</p>';
});

socket.on('time', function (data) {
  document
    .getElementById('receiver')
    .innerHTML += '<p> 服务器授时：' + data + '</p>';
});

socket.on('message', function (data) {
  document
    .getElementById('receiver')
    .innerHTML += '<p> 服务器说：' + data + '</p>';
});

function clickBtn1() {
  socket.open();
}

function clickBtn2() {
  socket.emit('kill');
}