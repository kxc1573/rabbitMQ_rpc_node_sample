# rabbitMQ_rpc_node_sample
一个基于Promise对rabbitMQ RPC机制封装调用的开发示例

0. 开发时使用的node版本为6.8.11

1. rabbitMQ.js是对rabbitMQ接口的封装实现

2. rpc_client.js和rpc_server.js分别是RPC中client和server端的封装实现

3. config是rabbitMQ相关的配置示例

4. invoking_instance是从实际业务中抽离出来的对RPC使用，但没有给出具体的http请求的响应处理，需要自行处理，比如实现简单的RESTFul API。