# Zhmoll-Seckill 文档

## 一、返回码与返回提示

```
6000, '服务器内部错误'
5000, '错误的路由请求'
5001, '数据格式不正确！'
4000, '验证成功！'
4001, '学号/工号不正确！'
4002, '学号/工号与姓名不匹配！'
4003, '请在活动开始前30分钟内加入'
4004, '活动已结束'
4100, '获取首页成功'
4101, '获取秒杀活动成功'
4102, '找不到该秒杀活动'
4500, '获取秒杀活动成功'
4501, '找不到该秒杀'
4502, '创建该秒杀成功'
4503, '修改该秒杀成功'
4504, '启用该秒杀成功'
4505, '删除该秒杀成功'
4506, '请将秒杀启用时间设置为至少一小时以后！'
4507, '该秒杀已启用'
4508, '秒杀活动已启用，无法修改！'
4509, '秒杀活动已启用，无法删除！'
4505, '删除该秒杀成功'
4601, '秒杀活动尚未启用！'
4602, '请在秒杀活动开始20分钟后再获取获奖列表'
```

## 二、Api

### 1、用户

#### 1)、获取首页

`get` `/api/seckill`

返回

```json
{
  "code": 4100,
  "message": "获取首页成功",
  "body": [
    {
      "_id": "58f376bd1f1d3b132509ab00",
      "startAt": "2017-04-16T14:15:00.000Z",
      "logoUrl": "http://www.baidu.com/baidu.jpg",
      "title": "秒杀活动名称er",
      "description": "大家快来抢啊"
    },
    {
      "_id": "58f38152f893b411b5ad7304",
      "startAt": "2017-04-14T15:00:00.000Z",
      "logoUrl": "http://cdn.etuan.org/img/wx-etuan.jpg",
      "title": "团团一家年中庆典会场抢票",
      "description": "团团一家历年的庆典会场十分有趣，但入场门票却不好抢哦！"
    }
  ]
}
```

#### 2)、获取某秒杀活动详情

`get` `/api/seckill/:seckillid`

返回

```json
{
  "code": 4101,
  "message": "获取秒杀活动成功",
  "body": {
    "_id": "58f376bd1f1d3b132509ab00",
    "startAt": "2017-04-16T14:15:00.000Z",
    "detail": "这个是活动详情，上面那个是简单概要",
    "logoUrl": "http://www.baidu.com/baidu.jpg",
    "title": "秒杀活动名称er",
    "content": [
      {
        "name": "抢票项目一",
        "description": "描述一",
        "limit": 20,
        "_id": "58f376bd1f1d3b132509ab02"
      },
      {
        "name": "抢票项目二",
        "description": "描述二",
        "limit": 20,
        "_id": "58f376bd1f1d3b132509ab01"
      }
    ],
    "description": "大家快来抢啊"
  }
}
```

#### 3)、换取token请求

`post` `/api/seckill/:seckillid/join`

发送

```json
{
  "uid": "14051534",
  "name": "张效伟"
}
```

返回

```json
{
  "code": 4000,
  "message": "验证成功！",
  "body": {
    "token": "123456789123ABCDEF"
  }
}
```

前端需要保存`token`并配上秒杀活动id`seckillid`，在连接上Websocket连接后发送给对应鉴权事件。

### 2、管理员（暂未做ACL控制）

#### 1）、发起活动

`post` `/api/seckill-management`

发送

```json
{
  "title": "秒杀活动名称",
  "logoUrl": "http://www.baidu.com/baidu.jpg",
  "description": "大家快来抢啊",
  "detail": "这个是活动详情，上面那个是简单概要",
  "startAt": "1492183193800",
  "content": [
    {
      "name": "抢票项目一",
      "description": "描述一",
      "limit": 20
    },
    {
      "name": "抢票项目二",
      "description": "描述二",
      "limit": 20
    }
  ]
}
```

返回

```json
{
  "code": 4502,
  "message": "创建该秒杀成功",
  "body": {
    "startAt": "2017-04-14T15:19:53.800Z",
    "detail": "这个是活动详情，上面那个是简单概要",
    "logoUrl": "http://www.baidu.com/baidu.jpg",
    "title": "秒杀活动名称",
    "_id": "58f0e978dd122d12f0cd5960",
    "isDeleted": false,
    "enable": false,
    "content": [
      {
        "name": "抢票项目一",
        "description": "描述一",
        "limit": 20,
        "_id": "58f0e978dd122d12f0cd5962"
      },
      {
        "name": "抢票项目二",
        "description": "描述二",
        "limit": 20,
        "_id": "58f0e978dd122d12f0cd5961"
      }
    ],
    "description": "大家快来抢啊"
  }
}
```

对于前端而言，可能重要的数据是`body._id`，这是创建好的秒杀活动的`id`。

#### 2）、创建者获取活动

`get` `/api/seckill-management/:seckillid`

返回

```json
{
  "code": 4500,
  "message": "获取秒杀活动成功",
  "body": {
    "startAt": "2017-04-14T15:19:53.800Z",
    "detail": "这个是活动详情，上面那个是简单概要",
    "logoUrl": "http://www.baidu.com/baidu.jpg",
    "title": "秒杀活动名称",
    "_id": "58f0e978dd122d12f0cd5960",
    "isDeleted": false,
    "enable": false,
    "content": [
      {
        "name": "抢票项目一",
        "description": "描述一",
        "limit": 20,
        "_id": "58f0e978dd122d12f0cd5962"
      },
      {
        "name": "抢票项目二",
        "description": "描述二",
        "limit": 20,
        "_id": "58f0e978dd122d12f0cd5961"
      }
    ],
    "description": "大家快来抢啊"
  }
}
```

#### 3)、创建者修改活动

`put` `/api/seckill-management/:seckillid`

已经启用的秒杀活动是无法再被修改的。

发送（以下内容，修改什么发什么，不修改的字段不要发过来）

```json
{
  "title": "修改后的标题",
  "logoUrl": "http://www.baidu.com/modified.jpg",
  "description": "如果不修改内容，请把该字段去掉",
  "detail": "详情"
  // "startAt": "" 因为不修改这个字段，所以不要发过来
  // "content": "" 因为不修改这个字段，所以不要发过来
}
```

返回

```json
{
  "code": 4503,
  "message": "修改该秒杀成功",
  "body": {
    "startAt": "2017-04-14T15:19:53.800Z",
    "detail": "详情",
    "logoUrl": "http://www.baidu.com/modified.jpg",
    "title": "修改后的标题",
    "_id": "58f0e978dd122d12f0cd5960",
    "isDeleted": false,
    "enable": false,
    "content": [
      {
        "name": "抢票项目一",
        "description": "描述一",
        "limit": 20,
        "_id": "58f0e978dd122d12f0cd5962"
      },
      {
        "name": "抢票项目二",
        "description": "描述二",
        "limit": 20,
        "_id": "58f0e978dd122d12f0cd5961"
      }
    ],
    "description": "如果不修改内容，请把该字段去掉"
  }
}
```

#### 4)、创建者启用秒杀

`get` `/api/seckill-management/:seckillid/enable`

只有被启用的秒杀才会正式使用，此时会向缓存数据库写一定的内容。启用秒杀需要秒杀开始时间距现在一个小时以后。启用后的秒杀活动不再允许修改。

返回

```json
{
  "code": 4504,
  "message": "启用该秒杀成功"
}
```

```json
{
  "code": 4506,
  "message": "请将秒杀启用时间设置为至少一小时以后！"
}
```

```json
{
  "code": 4507,
  "message": "该秒杀已启用"
}
```

#### 5)、创建者删除秒杀

`delete` `/api/seckill-management/:seckillid`

返回

```json
{
  "code": 4505,
  "message": "删除该秒杀成功"
}
```

```json
{
  "code": 4509,
  "message": "秒杀活动已启用，无法删除！"
}
```

#### 6)、创建者获得秒杀活动获奖名单

`get` `/api/seckill-management/:seckillid/awardlist`

返回：弹出下载窗口，下载xlsx结果文件。

或者

```json
{
  "code": 4601,
  "message": "秒杀活动尚未启用！"
}
```

```json
{
  "code": 4602,
  "message": "请在秒杀活动开始20分钟后再获取获奖列表"
}
```

## 三、WebSocket事件

### 1、服务器端接受的事件

#### 1)、`auth`

接收

```json
{
  "seckillid": "12313246546ABCDEF",
  "token": "12313246546asdfadf"
}
```

其中token为请求参与秒杀而换取token的返回值，与特定用户、秒杀活动绑定。

2)、`submitkill`

无事件体。

注意该接口需要在鉴权`auth`事件完成后才能发送。前端需要注意该事件的发送时间，即需要根据服务器授权时间与当前浏览器本地时间差判断是否将本请求发送出去。不正确的发送时间以及单位时间内过量的发送次数会导致封锁token，认定作弊。成功以或者失败会发送`succeed`、`failure`给浏览器。

### 2、浏览器端接受的事件

#### 1)、`connect`

无事件体。

该事件在Websocket连接完成后立刻触发，需要在该事件中发起对服务器的鉴权事件`auth`。

参考的处理代码如下：

```javascript
socket.on('connect', function () {
  socket.emit('auth', { seckillid: seckillid, token: token });
});
```

#### 2)、`message`

```json
{
  "t": "14000000000", // 服务器授时，是距1970年1日1日毫秒那个
  "h": "23", // 当前在线人数
  "r", "150", // 奖品余量
  "m", "啦啦啦", // 服务器发送的消息
  "e", "DATA_MISSING"  // 错误信息
}
```

服务器授予的信息内容并不是每次都完整包含这五项内容。其中用户一旦鉴权完毕，就会收到一个信息授予。其次，用户收到错误信息后会收到一个信息授予，通常也伴随着断开Websocket连接。其中，奖品余量与当前在线人数这两个消息并不是实时的，而是仿照实时的，是为了减少流量压力，可以认为是存在延迟的。前端需要在收到授予信息后填充相应的内容。

参考的处理代码如下：

```javascript
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
```

#### 3)、`succeed`

在发送秒杀信息后，若成功，则返回该事件。返回的内容为纯文本，秒杀成功的奖品名称。

前端需要将该文本内容告知用户。

参考的处理代码如下：

```javascript
socket.on('succeed', function (name) {
  document
    .getElementById('receiver')
    .innerHTML += '<span> 恭喜你，抢到了[' + name + ']！ </span>';
});
```

#### 4)、`failure`

在发送秒杀信息后，若失败，则返回该事件。返回的内容为纯文本，秒杀失败的缘由。

参考的处理代码如下：

```javascript
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
});
```

注：因作弊而触发的事件的返回是`message`事件。

5)、`disconnect`

在断开连接时，会触发该事件。没有消息体。

参考的处理代码：

```javascript
socket.on('disconnect', function () {
  document
    .getElementById('receiver')
    .innerHTML += '<p> 连接被关闭 </p>';
});
```