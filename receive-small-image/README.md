## 针对性测试内容

1. 测试丢图现象

## 测试方案

- 准备1M以下各不等的图片，单聊群聊共发N条，测试是否能全部收到

1. 新建 .env 文件，填入配置信息

```env
CREATE_ROOM_NUM=2
CREATE_ROOM_TOPIC_TEMP=收发消息测试
SEND_ROOM_NUM=2
SEND_CONTACT_ID=1688853462989866
SEND_CONTACT_NAME=机器人管家
RECEIVE_WECHAT_ID=1688850321595920
RECEIVE_WECHAT_NAME=RUI
TOTAL=720
```

- CREATE_ROOM_NUM: 要创建的群聊的个数
- CREATE_ROOM_TOPIC_TEMP: 创建的群聊的群名称模板，比如测试1，测试2。。。 模板就是测试

2. 运行 run.sh , 会同时启动send receive

```sh
sh run.sh
```

## 自动扫码

1. send 会自动启动3789端口来启动同步二维码的服务

2. 收发消息两个托管微信上都安装Auto.js，并且同步对应的文件ReceiveFileSync.js SendFileSync.js wework.js
然后开启自动循环跑任务，确认手机上这个文件存在DCIM/000qrcode.png，没有则复制一个文件并且命名为000qrcode.png(因为auto.js脚本
创建的文件可能没有权限，覆盖一个有权限的文件则可以)

## 报告样式

- 会在各个版本下生成对应token的verbose日志文件
- 执行完脚本后有发消息报告.md 收消息报告.md 会自动合并到各版本下的README.md
- 还有一个手动写的README.md 总结各版本的收发异常情况
