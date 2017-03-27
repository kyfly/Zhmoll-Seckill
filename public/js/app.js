document.onload = function () {

}

let token;

var socket = io('/seckill', {
  reconnectionAttempts: 3,
  autoConnect: false
});

socket.on('connect', function () {
  socket.emit('auth', { seckillid: document.getElementById('seckillid').value, token: token });
});

socket.on('welcome', function (data) {
  document
    .getElementById('receiver')
    .innerHTML += '<p> 服务器连接成功 </p>';
});

socket.on('message', function (data) {
  console.log(data);
  if (data.t)
    document
      .getElementById('time')
      .innerHTML = '服务器授时：' + data.t;
  if (data.h)
    document
      .getElementById('online_count')
      .innerHTML = '在线' + data.h + '人';
  if (data.r)
    document
      .getElementById('award_rest')
      .innerHTML = '剩余' + data.r + '项';
  if (data.m)
    document
      .getElementById('receiver')
      .innerHTML += '<span> 服务器说：' + data.m + '</span>';
  if (data.e)
    document
      .getElementById('receiver')
      .innerHTML += '<span> 服务器检测到：' + data.e + '</span>';
});

socket.on('failure', function (result) {
  switch (result) {
    case 'notyet':
      document
        .getElementById('receiver')
        .innerHTML += '<span> 秒杀还未开始 </span>';
      break;
    case 'awarded':
      document
        .getElementById('receiver')
        .innerHTML += '<span> 你已经抢过了哦！ </span>';
      break;
    case 'finished':
      document
        .getElementById('receiver')
        .innerHTML += '<span> 奖品都被抢完啦！ </span>';
      break;
    case 'again':
      document
        .getElementById('receiver')
        .innerHTML += '<span> 还差一点点，再试一次！ </span>';
      break;
  }
})

socket.on('succeed', function (name) {
  document
    .getElementById('receiver')
    .innerHTML += '<span> 恭喜你，抢到了[' + name + ']！ </span>';
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
  for (let i = 0; i < 4; i++)
    socket.emit('submitkill');
}

function clickBtn() {
  seckillid = document.getElementById('seckillid').value;
  $.post('/api/seckill/' + seckillid + '/join', {
    uid: document.getElementById('uid').value,
    name: document.getElementById('name').value
  }, function (data, status) {
    token = data.body.token;
  });
}