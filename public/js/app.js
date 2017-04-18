// global
var socket;
var clickCount = 7;
var countDown = 0; // 服务器与本地的时间差
var serverStart = 0; // 服务器活动开始时间
setInterval(function () { clickCount = 7; }, 1000);

var vm = new Vue({
    el: "#app",
    data: {
        seckillid: '',
        // 以下是打开页面获取的信息
        gotSeckill: false,
        seckill: {
            title: '团团一家秒杀活动',
            description: '',
            startAt: '',
            logoUrl: '',
            content: [],
            totalAwardCount: 0
        },
        // 以下是登录需要的信息
        field_uid: localStorage.uid || "",
        field_name: localStorage.name || "",
        // 以下是登录后的信息
        isLogin: false,
        online_count: 0,
        rest_count: 0,
        log_box: localStorage.info_box && JSON.parse(localStorage.info_box) || []
    },
    mounted: function initWhenMounted() {
        // 0、初始化控件
        toastr.options.newestOnTop = false;
        toastr.options.timeOut = 20;
        var seckillid = window.location.pathname.split('/')[2];
        // 1、获取seckillid
        this.seckillid = seckillid;
        // 2、拿缓存数据
        if (localStorage[seckillid]) {
            var seckill_in_cache = JSON.parse(localStorage[seckillid]);
            initContent(this.seckill, seckill_in_cache);
        }
        // 3、发起请求
        axios.get('/api/seckill/' + seckillid)
            .then(function (res) {
                // 3、拿到数据
                var data = res.data;
                if (data.code != 4101)
                    throw new Error('获取秒杀活动失败');
                initContent(vm.seckill, data.body);
                // 4、标记拿到数据
                vm.gotSeckill = true;
                // 5、缓存数据
                localStorage[seckillid] = null;
                localStorage[seckillid] = JSON.stringify(vm.seckill);
            }).catch(function (error) {
                emitToastr(error.message, 'error');
            });
    },
    methods: {
        login: function login_btn() {
            var seckillid = this.seckillid;
            localStorage.uid = this.field_uid;
            localStorage.name = this.field_name;
            axios
                .post('/api/seckill/' + seckillid + '/join', { uid: this.field_uid, name: this.field_name })
                .then(function (res) {
                    var data = res.data;
                    var retcode = data.code;
                    switch (retcode) {
                        case 4000: login_succeed(data.body.token); break;
                        case 4001: emitToastr('登录失败，学号／工号不存在。', 'error'); break;
                        case 4002: emitToastr('登录失败，请核对学号／工号与姓名是否匹配。', 'error'); break;
                        case 4003: emitToastr('登录失败，请在活动开始前30分钟内再来登录。', 'error'); break;
                        case 4004: emitToastr('登录失败，本次活动已经结束。', 'error'); break;
                        case 4102: emitToastr('登录失败，找不到该秒杀活动。', 'error'); break;
                        default: emitToastr('登录失败', 'error'); break;
                    }
                })
                .catch(function (error) {
                    console.error(error);
                });
        },
        kill: function kill_btn() {
            var serverTime = Date.now() + countDown;
            if (serverStart === 0) return;
            if (serverTime - serverStart > -1000) {
                if (clickCount > 0) {
                    clickCount--;
                    socket.emit('submitkill');
                }
                return;
            }
            emitToastr('秒杀还没开始!');
        }
    }
});

function initContent(target, source) {
    target.title = source.title;
    target.startAt = source.startAt;
    target.logoUrl = source.logoUrl;
    target.description = source.description;
    target.totalAwardCount = 0;
    target.content.splice(0, target.content.length);
    source.content.forEach(function (item) {
        target.content.push(item);
        target.totalAwardCount += item.limit;
    });
}

function initCountdown(date) {
    $('.countdown').downCount({
        date: date,
        offset: +8
    }, function () {

    });
}

function login_succeed(token) {
    vm.token = token;
    socket = (function () {
        var socket = io('/seckill', {
            reconnectionAttempts: 1,
            autoConnect: false,
            query: 'seckillid=' + vm.seckillid + '&token=' + vm.token
        });
        socket.on('connect', function () {
            vm.isLogin = true;
            emitToastr('登陆成功', 'success');
        });
        socket.on('succeed', function (name) {
            emitToastr('恭喜你抢到[' + name + ']啦!', 'success');
        });
        socket.on('failure', function (msg) {
            switch (msg) {
                case 'notyet': emitToastr('秒杀还没开始!'); break;
                case 'awarded': emitToastr('你已经抢过票了!'); break;
                case 'finished': emitToastr('票已经被抢完啦!'); break;
                case 'again': emitToastr('差一点点就抢到啦!再继续试试!'); break;
            }
        });
        socket.on('message', function (data) {
            if (data.t) {
                // 校准服务器与本地时间差
                countDown = data.t - Date.now();
                serverStart = (new Date(vm.seckill.startAt)).getTime();
                initCountdown(vm.seckill.startAt);
            }
            if (data.e) emitToastr(data.e, 'error');
            if (data.r !== undefined) vm.rest_count = data.r;
            if (data.h !== undefined) vm.online_count = data.h;
            if (data.m) emitToastr(data.m);
        });
        socket.on('disconnect', function () {
            vm.isLogin = false;
            emitToastr('与服务器连接中断');
        });
        socket.on('connect_error', function (data) {
            emitToastr('服务器拒绝连接', 'error');
        });
        socket.open();
        return socket;
    })();
}

function emitToastr(msg, type) {
    type = type || 'info';
    toastr[type](msg);
    const item = { time: new Date(), seckillid: vm.seckillid, token: vm.token, message: msg, type: type };
    vm.log_box.unshift(item);
    localStorage.log_box = JSON.stringify(vm.log_box);
    console.log(JSON.stringify(item));
}