var socket = io('/seckill', {
    reconnectionAttempts: 3,
    autoConnect: false
});
var severRequest;
var countDown = 0;
// socket.on('message', function (data) {
//     if (data.t) {
//         countDown = data.t - Date.now();
//         console.log('set countDown='+countDown)
//     }

// });
var clickCount = 9; //前端限制每1秒次数
setInterval(function () {
    clickCount = 9;
}, 1000);
var vm = new Vue({
    el: "#app",
    data: {
        ok: false,
        stu: {
            id: '',
            name: ''
        },
        online: 10,
        allTicket: 50,
        rest: 50,
        token: '',
        seckillid: '58f4083fced53c3746c7d32c',
        start: '',
        countDown: 0
    },
    mounted: function () {
        axios.get('/api/seckill/' + this.seckillid).then(function (response) {
            serverRequest = response.data;
            console.log(serverRequest)
        }).catch(function (error) {
            console.log(error)
        })
        socket.on('connect', this.connect);
        socket.on('succeed', this.succeed);
        socket.on('failure', this.failure);
        socket.on('message', this.message);
        // this.socket.on('disconnect',this.disconnect);
        // this.socket.on('failure',this.failure);
    },
    methods: {
        connect: function () {
            socket.emit('auth', { seckillid: this.seckillid, token: this.token });
            console.log(1)
            toastr.success('登陆成功')
            setInterval(function () {
                count = 9;
            }, 1000);
        },
        succeed: function () {
            toastr.success('恭喜你抢到票啦!!!')
        },
        message: function (data) {
            console.log(data)
            if (data.t) {
                this.countDown = data.t - Date.now();
                console.log('set countDown=' + countDown)
            }
            if (data.e) {
                toastr.error(data.e)
            }
            if (data.r) {
                this.rest = data.r;
            }
            if (data.h) {
                this.online = data.h
            }
            if (data.m) {
                toastr.error(data.m)
            }
        },
        failure: function (result) {
            switch (result) {
                case 'notyet':
                    toastr.warning('还没开始!!!')
                    break;
                case 'awarded':
                    toastr.warning('你已经抢过票了!')
                    break;
                case 'finished':
                    toastr.warning('票已经被抢完啦!')
                    break;
                case 'again':
                    toastr.warning('差一点点就抢到啦!再继续试试!')
                    break;
            }
        },
        login: function () {
            axios.post('/api/seckill/' + this.seckillid + '/join',
                // {uid:this.stu.id,
                // name:this.stu.name}
                {
                    uid: '14051534',
                    name: '张效伟'
                }
            ).then(function (response) {
                var loginCode = response.data.code;
                if (loginCode == 4000) {
                    console.log(0)
                    vm.token = response.data.body.token;
                    console.log(vm.token)
                    socket.open();
                    vm.ok = true;
                } else if (loginCode == 4001) {
                    toastr.error('登录失败,请检查你的学号／工号是否正确。')
                } else if (loginCode == 4002) {
                    toastr.error('登陆失败,请核对你的姓名与学号／工号。')
                } else if (loginCode == 4003) {
                    toastr.error('登陆失败,请在活动开始前30分钟内加入。')
                } else if (loginCode == 4004) {
                    toastr.error('登陆失败,本次活动已经结束。')
                } else {
                    toastr.error('登陆失败。')
                }
            })
                .catch(function (error) {
                    console.log(error)
                    toastr.success('登陆失败')
                })
        },
        kill: function () {
            var serverTime = Date.now() + countDown;
            var serverStart = (new Date(serverRequest.body.startAt)).getTime();
            if (serverTime - serverStart > -1000) {
                if (clickCount > 0) {
                    console.log(1);
                    clickCount--;
                    socket.emit('submitkill');
                }
            } else {
                toastr.warning('抢票还未开始')
            }
        }
    }
})

