
## 针对性测试内容

1. 联系人超时报错
2. 对比ready时间和好友、群个数
3. 测试数据加载

## 测试方案

### 1. 企微方案

1. 运行 run.sh

```sh
sh run.sh
```


### 2. 自动扫码

1. sh run-startSync.sh 会在当前目录3789端口启动同步服务

2. 加载托管微信上都安装Auto.js，并且同步对应的文件loadingFileSync.js wework.js
然后开启自动循环跑任务，确认手机上这个文件存在DCIM/000qrcode.png，没有则复制一个文件并且命名为000qrcode.png(因为auto.js脚本
创建的文件可能没有权限，覆盖一个有权限的文件则可以)

## 报告样式

Version |Qrcode | Ready| Inner | External | Other | Room | Inner | External | Other | Room | token |
-- | -- | -- | -- | -- | --| --| --| --| --| --| --
0.1.135 | 1.244s | 339.592s  | 0.002s | 0.004s | 0.019s  | 0.001s | 43个 | 486个 | 2285个 | 167个 | puppet_wxwork_5fea12b7dce82310 |
0.1.136 | 1.216s | 338.326s  | 0.002s | 0.005s | 0.022s  | 0.004s | 43个 | 486个 | 2285个 | 167个 | puppet_wxwork_a478a428427b9b08 |

- 详细见 result 文件夹下的内容
- *-*.log 是报告对应的日志文件
- 看event.txt 的顺序
- 看是否有 error.txt (不该有)
- 看是否有 logout.txt (不该有)
- 看log.log 是否打印了所有的contact信息
- 看log.log 是否打印了所有的room 信息
- 和之前的contact和room 数量做对比
