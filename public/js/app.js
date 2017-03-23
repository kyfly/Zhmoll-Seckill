document.onload = function () {

}

let token;

var socket = io('/' + 'seckillId', {
  reconnectionAttempts: 3,
  autoConnect: false
});

socket.on('connect', function () {
  socket.emit('auth', { uid: '14051534', token: token });
});

socket.on('disconnect', function () {
  document
    .getElementById('receiver')
    .innerHTML += '<p> 连接被关闭 </p>';
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

function clickBtn() {
  $.post('/api/login', {
    uid: 14051534,
    name: '张效伟'
  }, function (data, status) {
    token = data.body.token;
  });
}