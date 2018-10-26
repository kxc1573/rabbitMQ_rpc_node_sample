'use strict';

var amqplib = require('amqplib');
var config = require('config');

class RabbitMQ {

    initialize() {
        return new Promise((resolve, reject) => {
            let rabbitmqConf = config.get('rabbitmq');
            let username = rabbitmqConf.username;
            let password = rabbitmqConf.password;
            let host = rabbitmqConf.host;
            let port = rabbitmqConf.port;
            let vhost = rabbitmqConf.vhost;
            let URI = "amqp://";
            if (username && password) {
                URI += `${username}:${password}@`;
            }
            URI += `${host}:${port}`;
            if (vhost) {
                if (vhost.startsWith('/')) {
                    URI += vhost;
                } else {
                    URI += '/' + vhost;
                }
            }
            try {
                console.info(` Connecting to rabbitMQ ${URI}`);
                amqplib.connect(URI).then((conn) => {
                    this.connection = conn;
                    conn.createChannel().then((ch) => {
                        this.channel = ch;
                        resolve();
                    });
                });
            } catch (error) {
                console.error(` Error: ${error}`);
                reject(error);
            }
        });
    }

    createQueue(queue) {
        return new Promise((resolve, reject) => {
            // something need attention here.
            this.channel.assertQueue(queue, { autoDelete: true }).then((ret) => {
                console.info(` Queue ${ret.queue} created.`);
                resolve(ret);
            });
        });
    }

    deleteQueue(queue) {
        return new Promise((resolve, reject) => {
            this.channel.deleteQueue(queue).then((ret) => {
                console.info(` Queue ${queue.queue} deleted.`);
                resolve(ret);
            });
        });
    }

    listenOnQueue(queue, callback) {
        return new Promise((resolve, reject) => {
            let ret = this.channel.consume(queue, (msg) => {
                callback(msg);
                this.channel.ack(msg);
            });
            resolve(ret);
        });

    }

    sendMessageToQueue(queue, msg) {
        return new Promise((resolve, reject) => {
            let ret = this.channel.sendToQueue(queue, new Buffer(msg));
            resolve(ret);
        });
    }
}

module.exports = RabbitMQ;