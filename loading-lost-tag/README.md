## 针对性测试内容

1. 崩溃导致标签备注丢失

## 测试方案

- 有个发消息的号给测试号不断发消息
- 测试号在ready的时候去给特定打好备注标签的联系人写一遍手机号
- 测试号在不断收消息中可能崩溃导致备注标签的丢失

1. 运行 run.sh , 会同时启动send receive

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
- 执行完脚本后各版本下有README.md
- 还有一个手动写的README.md 总结各版本标签异常总体情况
