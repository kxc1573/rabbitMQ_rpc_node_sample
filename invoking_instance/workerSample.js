/**
 * 
 * @authors Alwyn
 * @date    2017-10-10
 * @desc    rpc架构下worker的示例
 */

var RPCServer = require('../rpc_server');

// 实例化rpc服务端
var rpcServer = new RPCServer('public_queue', 1, 'dedicate_001_queue');
rpcServer.initialize().then(function() {
    rpcServer.onMsg(process);
});

function process (msg) {
    console.info(`Msg received: ${msg}`);
    return new Promise((resolve, reject) => {
        let data = JSON.parse(msg);
        if (data.method == 'GET') {
            data.res = Math.sqrt(data.a);
        } else {
            data.res = Math.pow(data.a, 3);
        }
        console.info(data.res);
        resolve(data);
    });
}