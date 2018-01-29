'use strict';

var RabbitMQ = require('./rabbitmq');

class RPCServer extends RabbitMQ {

    constructor(publicQueue, prefetch, privateQueue = null) {
        super();
        this.queueName = publicQueue;
        this.privateQueue = privateQueue;
        this.prefetch = prefetch;
    }

    initialize() {
        let superInitializer = super.initialize.bind(this);
        return new Promise((resolve, reject) => {
            superInitializer().then(() => {
                this.createQueue(this.queueName).then((publicQueue) => {
                    this.queue = publicQueue;
                    this.createQueue(this.privateQueue).then((dedicateQueue) => {
                        this.dedicateQueue = dedicateQueue;
                        this.dedicateQueueName = this.dedicateQueue.queue;
                        console.info(` deticated queue created: ${this.dedicateQueue.queue}`);
                        resolve();
                    });
                });
            });
        }); 
    }

    dedicateQueue() {
        let self = this;
        if (self.dedicateQueue) {
            return self.dedicateQueue.queue;
        }
        return null;
    }

    msgHandler(msg) {
        if (msg !== null) {
            this.clientCallback(msg.content.toString()).then((result) => {
                console.info(` result of the callback: ${JSON.stringify(result)}`);
                if (msg.properties.replyTo) {
                    if (result === undefined) {
                        result = '';
                    } else if (!(result instanceof String) && (typeof result) !== 'string') {
                        result = JSON.stringify(result);
                    }
                    console.info(` the sender wants a reply at queue ${msg.properties.replyTo}, with correlationId: ${msg.properties.correlationId}, sending: ${result}`);
                    this.channel.sendToQueue(
                        msg.properties.replyTo,
                        new Buffer(result),
                        {
                            correlationId: msg.properties.correlationId
                        }
                    );
                    this.channel.ack(msg);
                }
            });
        }
    }

    onMsg(callback) {
        this.clientCallback = callback;
        this.channel.prefetch(this.prefetch).then(() => {
            this.channel.consume(this.queueName, this.msgHandler.bind(this)).then((publicConsumer) => {
                this.publicQueueConsumer = publicConsumer;
            });
            this.channel.consume(this.dedicateQueueName, this.msgHandler.bind(this)).then((dedicateConsumer) => {
                this.dedicateQueueConsumer = dedicateConsumer;
            });
        });
    }

    suspend() {
        this.channel.cancel(this.publicQueueConsumer.consumerTag);
        this.channel.cancel(this.dedicateQueueConsumer.consumerTag);
        this.createQueue(this.queueName).then((publicQueue) => {
            this.queue = publicQueue;
            this.createQueue(this.dedicateQueueName).then((dedicateQueue) => {
                this.dedicateQueue = dedicateQueue;
                console.warn(' Rabbitmq server Suspended to prevent further tasks.');
            });
        });
    }

    resume() {
        this.channel.consume(this.queueName, this.msgHandler.bind(this)).then((publicConsumer) => {
            this.publicQueueConsumer = publicConsumer;
        });
        this.channel.consume(this.dedicateQueueName, this.msgHandler.bind(this)).then((dedicateConsumer) => {
            this.dedicateQueueConsumer = dedicateConsumer;
        });
        console.warn(' Rabbitmq server resumed , and ready to take tasks');
    }
}

module.exports = RPCServer;