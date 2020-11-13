
## 针对性测试内容

1. Wechaty 事件的顺序
2. LOGOUT 以后是否会二次调用READY事件

## 测试方案

### 1. 企微方案

1. 新建 .env 文件，填入配置信息

```env
TEST_NAME=RUI
PUPPET_DOCKER_VERSION=0.1.144
DURATION_MM=30
```

2. 运行 run.sh


```sh
sh run.sh
```

### 2. 自动扫码

1. sh run-startSync.sh 会在当前目录3789端口启动同步服务

2. 在auto.js上循环任务

## 报告样式

- run.sh 在result各个版本下 生成的文件夹会有三个文件： event.txt 和 log.log 和 README.md
- 整体会有一个手动写的 README.md，记录每个版本总的扫码次数和异常次数


检查内容：

- 看 event.txt 的顺序
  - ready 应该只是在login后面
  - logout 后面不应该有ready
- 看 log 是否有 error
- 看是否有 error.txt 的文件
- 查看每个版本下的 README.md 文件中的每个token的输出日志顺序是否正常，出现连续多次ready就是异常

## 安装工具

- iTerm： 利用iTerm开启多个Tab
