/**
 * 
 * @authors Alwyn
 * @date    2017-10-10
 * @desc    rpc架构下router的示例
 */

var RPCClient = require('../rpc_client');

// 实例化rpc客户端
var rpcClient = new RPCClient('public_queue', 'back_queue');
// rpcClient.initialize();

function testRouter (req, res) {
    let data = {};
    if (req.method === 'GET') {
        Object.assign(data, req.query);
    } else if (req.method === 'POST') {
        Object.assign(data, req.body);
    } else {
        console.error('wrong http method: ' + req.method);
    }
    data.method = req.method;

    // let result = rpcClient.sendToQueue(JSON.stringify(data), 'public_queue');
    rpcClient.send(JSON.stringify(data)).then(function(response) {
        console.info(response);
        res.send(JSON.parse(response));
    });
}

module.exports = testRouter;