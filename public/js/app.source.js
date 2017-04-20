var s;
var time_difference; // 服务器与本地的时间差
var serverStart = 0; // 服务器活动开始时间
var login_click_mutex = false; // 登录按钮互斥锁
var countdown_timer;

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
        field_uid: localStorage.uid || '',
        field_name: localStorage.name || '',
        // 以下是登录后的信息
        isLogin: false,
        online_count: 0,
        rest_count: 0,
        awardname: '',
        lastCommit: Date.now(),
        log_box: localStorage.info_box && JSON.parse(localStorage.info_box) || []
    },
    mounted: function initWhenMounted() {
        // 0、初始化控件
        toastr.options.newestOnTop = false;
        toastr.options.timeOut = 20;
        // 1、获取seckillid
        var seckillid = window.location.pathname.split('/')[2];
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
                if (data.code != 4101) throw new Error('获取秒杀活动失败');
                initContent(vm.seckill, data.body);
                serverStart = (new Date(vm.seckill.startAt)).getTime();
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
            if (!login_click_mutex)
                login_click_mutex = true;
            else
                return;
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
                    login_click_mutex = false;
                })
                .catch(function (error) {
                    console.error(error);
                    login_click_mutex = false;
                });
        },
        kill: function kill_btn() {
            var now = Date.now();
            var serverTime = now + time_difference;
            if (serverStart === 0) return;
            if (serverTime - serverStart > -1000) {
                if (now - vm.lastCommit > 140) {
                    s.emit('submitkill');
                    vm.lastCommit = now;
                }
                return;
            }
            emitToastr('活动还没开始!');
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
    if (countdown_timer) {
        clearInterval(countdown_timer);
    }
    countdown_timer = setInterval(function () {
        var target_date = new Date(date),
            current_date = new Date();
        var difference = target_date - current_date;
        if (difference < 0) {
            clearInterval(countdown_timer);
            return;
        }
        var _second = 1000,
            _minute = _second * 60,
            _hour = _minute * 60,
            _day = _hour * 24;
        var days = Math.floor(difference / _day),
            hours = Math.floor((difference % _day) / _hour),
            minutes = Math.floor((difference % _hour) / _minute),
            seconds = Math.floor((difference % _minute) / _second);
        days = (String(days).length >= 2) ? days : '0' + days;
        hours = (String(hours).length >= 2) ? hours : '0' + hours;
        minutes = (String(minutes).length >= 2) ? minutes : '0' + minutes;
        seconds = (String(seconds).length >= 2) ? seconds : '0' + seconds;
        var ref_days = (days === 1) ? 'day' : 'days',
            ref_hours = (hours === 1) ? 'hour' : 'hours',
            ref_minutes = (minutes === 1) ? 'minute' : 'minutes',
            ref_seconds = (seconds === 1) ? 'second' : 'seconds';
        var container = $('.countdown');
        container.find('.days').text(days);
        container.find('.hours').text(hours);
        container.find('.minutes').text(minutes);
        container.find('.seconds').text(seconds);
        container.find('.days_ref').text(ref_days);
        container.find('.hours_ref').text(ref_hours);
        container.find('.minutes_ref').text(ref_minutes);
        container.find('.seconds_ref').text(ref_seconds);
    }, 222);
}

function login_succeed(token) {
    vm.token = token;
    s = (function () {
        var socket = io('/seckill', {
            reconnectionAttempts: 1,
            autoConnect: false,
            query: 'seckillid=' + vm.seckillid + '&token=' + vm.token
        });
        socket.on('connect', function () {
            vm.isLogin = true;
            emitToastr('登陆成功', 'success');
            if (localStorage[vm.seckillid + vm.field_uid] && localStorage[vm.seckillid + vm.field_uid] != '')
                vm.awardname = localStorage[vm.seckillid + vm.field_uid];
        });
        socket.on('succeed', function (name) {
            emitToastr('恭喜你抢到[' + name + ']啦!', 'success');
            localStorage[vm.seckillid + vm.field_uid] = vm.awardname = name;
            // 伪实时余量处理
            if (vm.rest_count > 0) vm.rest_count--;
        });
        socket.on('failure', function (msg) {
            switch (msg) {
                case 'notyet': emitToastr('活动还没开始!'); break;
                case 'awarded': emitToastr('已经抢到过啦，是[' + vm.awardname + ']!'); break;
                case 'finished': emitToastr('票已经被抢完啦!'); break;
                case 'again': emitToastr('差一点点就抢到啦!再继续试试!'); break;
                case 'cheated': emitToastr('检测到你作弊啦!'); break;
            }
        });
        socket.on('message', function (data) {
            if (data.t) {
                // 校准服务器与本地时间差
                var now = Date.now();
                var new_time_difference = data.t - now;
                if (!time_difference || new_time_difference > time_difference) {
                    time_difference = new_time_difference;
                    initCountdown(new Date(serverStart - time_difference));
                }
            }
            if (data.e) emitToastr(data.e, 'error');
            if (data.r !== undefined) vm.rest_count = data.r;
            if (data.h !== undefined) vm.online_count = data.h;
            if (data.m) emitToastr(data.m);
        });
        socket.on('disconnect', function () {
            vm.isLogin = false;
            emitToastr('服务器连接中断');
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