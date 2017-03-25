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

socket.on('welcome', function (data) {
  document
    .getElementById('receiver')
    .innerHTML += '<p> 服务器连接成功 </p>';
});

socket.on('time', function (data) {
  document
    .getElementById('receiver')
    .innerHTML += '<p> 服务器授时：' + data + '</p>';
});

socket.on('message', function (data) {
  document
    .getElementById('receiver')
    .innerHTML += '<span> 服务器说：' + data + '</span>';
});

socket.on('changeRemainNum', function (num) {
  document
    .getElementById('receiver')
    .innerHTML += '<p> 还剩' + num + '个 </p>';
});

socket.on('result', function (data) {
  document
    .getElementById('receiver')
    .innerHTML += '<span> 服务器说：' + data + '</span>';
});

socket.on('disconnect', function () {
  document
    .getElementById('receiver')
    .innerHTML += '<p> 连接被关闭 </p>';
});

function clickBtn1() {
  socket.open();
}

function clickBtn2() {
  // 记得前端也要限制次数
  socket.emit('submitkill');
}

function clickBtn3() {
  $.get('/api/add', function (data, status) {
    document
      .getElementById('receiver')
      .innerHTML += '<p> 服务器说：' + data + ' </p>';
  });
}

function clickBtn() {
  $.post('/api/login', {
    uid: 14051534,
    name: '张效伟'
  }, function (data, status) {
    token = data.body.token;
  });
}