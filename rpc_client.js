'use strict';

var RabbitMQ = require('./rabbitmq');
var uuid = require('../utils/uuid');

class RPCClient extends RabbitMQ {

    /**
     * This is a RPC client over RabbitMQ.
     * parameter queue is the queue to send the RPC to,
     * parameter callbackQueue is the queue to receive the RPC result.
     **/
    constructor(queue, callbackQueue) {
        super();
        this.queueName = queue;
        this.callbackQueue = callbackQueue;
        this.outstandingRequests = [];
        this.initialize();
    }

    initialize() {
        let superInitializer = super.initialize.bind(this);
        return new Promise((resolve, reject) => {
            superInitializer().then(() => {
                this.createQueue(this.queueName).then((publicQueue) => {
                    this.publicQueue = publicQueue;
                    console.info(` public queue created: ${publicQueue.queue}`);
                    this.createQueue(this.callbackQueue).then((responseQueue) => {
                        this.responseQueue = responseQueue;
                        console.info(` callback queue created: ${responseQueue.queue}`);
                        this.channel.consume(this.responseQueue.queue, this.responseCallback.bind(this)).then(() => {
                            resolve();
                        });
                    });
                });
            });
        });
    }

    // this sends to the default queue, that all workers might be listening
    send(msg) {
        return this.sendToQueue(msg, this.publicQueue.queue);
    }

    sendToQueue(msg, queue) {
        return new Promise((resolve, reject) => {
            console.info(`sending message: ${msg}`);
            var correlationId = uuid();
            this.channel.sendToQueue(
                queue, 
                new Buffer(msg), 
                {
                    replyTo: this.responseQueue.queue,
                    correlationId: correlationId
                }
            );
            console.warn(` RPC call with correlationId ${correlationId} sent out `);
            // Store the resolver,  and let the responseCallback resolve it.
            this.outstandingRequests[correlationId] = resolve;

            /**
                The difference between responseCallback and callback:
                1) responseCallback return to the original request, it's will response after task done, it mean blocking risk.
                2) callback return to the callback url which provided by requester, need some other more code to do.
                Here can coexist just because the Promise allow resolve only only time.
            **/

            /**
            // 2.Response immediately for asynchronous task
            // if client want get result, can apply callback or query after. 
            try {
                let data = JSON.parse(msg);
                let asyncTypeList = [];    // the asynchronous task  types
                if (asyncTypeList.includes(data.type)) {
                    let response = {
                        tid: data.tid,
                        type: data.type,
                        status: 'new'
                    };
                    resolve(JSON.stringify(response));
                }
            } catch(e) {
                console.error(`Response in rpc_client's sentToQueue error: ${e.stack}`)
            }
            **/
        });
    }

    responseCallback(msg) {
        let resolve = this.outstandingRequests[msg.properties.correlationId];
        if (resolve) {
            resolve(msg.content.toString());
            delete this.outstandingRequests[msg.properties.correlationId];
        } else {
            // This only happens when frontend sends a task, and then the frontend restarts; 
            // when task finished, it's response be sended back to frontend (the one that just restarted), 
            // which doesn't have any knowlege about the resolve and correlationId.
            // in this case, we can do nothing but give it up.
            console.error(` An response with correlationID: ${msg.properties.correlationId} without corresponding request is received, this might be caused by the restart of the frontend`);
            console.error(` all the coorelationId now available are: ${JSON.stringify(this.outstandingRequests)}`);
        }
        this.channel.ack(msg);
    }
}

module.exports = RPCClient;