
## 针对性测试内容

1. 批量发送N条消息，统计发消息没有回调的概率

## 测试方案

1. 运行 run.sh
```sh
sh run.sh
```

## 自动扫码

1. sh run-startSync.sh 会在当前目录3789端口启动同步服务

2. 群发消息托管微信上都安装Auto.js，并且同步对应的文件SendFileSync.js wework.js
然后开启自动循环跑任务，确认手机上这个文件存在DCIM/000qrcode.png，没有则复制一个文件并且命名为000qrcode.png(因为auto.js脚本
创建的文件可能没有权限，覆盖一个有权限的文件则可以)

## 报告样式
 - run.sh 会在每个版本下生成一个 README.md
 - 整体会有一个手写的 README.md， 看数据汇总
