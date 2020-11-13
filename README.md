# WXWork Badcase

## 测试模块

- crash: 奔溃模块
- flood-message: 群发消息模块
- group-chat: 群聊模块
- loading： 加载模块
- loading-lost-tag: 标签丢失测试
- receive-and-send-message: 收发消息模块
- receive-small-image: 丢图测试

## 基础测试用例

### 黑屏

- 一扫码就崩溃（黑屏）
- 退出登陆就崩溃（黑屏）
- LOGOUT 以后是否会二次调用READY事件

### 事件

- SCAN
- LOGIN
  - 扫码登录
  - 自动登录
- READY
- ROOM-JOIN
- ROOM-LEAVE
- ROOM-TOPIC
- FRIENDSHIP
  - RECEIVE
  - CONFIRM
- LOGOUT
  - 你已在其他电脑登录，请重新登录。
  - 你已经在手机上退出企业微信。
  - 你已在手机上退出企业微信
  - 你已在其他电脑登录，请重新登录。
  - 已退出当前登录设备
  - 你在滴滴云的帐号已被管理员删除
  - 正在切换企业，请等待……
- ERROR
  - LAUNCH_TIMEOUT: login launch wxwork timeout
  - LAUNCH_FAILED: already launch wxwork more than ${MAX_LAUNCH_WX_WORK_TIMES} times, but in vain.
  - EXCEED_QUEUE_SIZE: Max queue size for id: ${queueId} reached: ${this.functionQueueMap[queueId].length} > ${MAX_QUEUE_SIZE}(max queue size). Drop this task
- RESET
  - CRASH_LOGOUT_MESSAGE: '虚拟企业微信客户端崩溃，重启中……'
  - STUCK_LOGOUT_MESSAGE: '虚拟企业微信客户端已崩溃，重启中……'
  - UNKNOWN_LOGOUT_MESSAGE: '系统错误导致虚拟企业微信客户端退出，重启中……'
  - SYNC_TIMEOUT_LOGOUT_MESSAGE: '虚拟企业微信客户端环境异常，重启中……'
  - HEARTBEAT_LOST_LOGOUT_MESSAGE: '虚拟企业微信客户端无响应，重启中……'
- HEARTBEAT

### 信息同步

- 是否能获取到所有的Contact
- 是否能获取到所有的 Room
- data-sync-test

### 信息发送

#### 消息类型

- 发消息没有回调，会出现TIMEOUT

##### 发送消息

- 图片支持10M以下
- 文件支持25M以下
- 小程序待定还没测
- 发送文字
- 发送图片
  - 10k
  - 500k
  - 1M
  - 3M
  - 5M
  - 10M
- 发送文件
  - 10k
  - 500k
  - 1M
  - 3M
  - 5M
  - 10M
  - 30M
- 发送图文消息
- 发送小程序

##### 收消息

- 收文字
- 收图片
  - 10k
  - 500k
  - 1M
  - 3M
  - 5M
  - 10M
  - 50M
- 收文件
  - 10k
  - 500k
  - 1M
  - 3M
  - 5M
  - 10M
  - 50M
- 收图文消息
- 收小程序

#### 消息频率

- 给1000个人发送消息

### 基础操作

- 修改备注

### 群操作

- 拉人进群: make-big-account
- 创建群聊: flood-message
  - 内部群聊
  - 外部群聊
  - 如果拉的人和机器人不是好友关系
- 踢人

### 异常消息

#### 群聊

- 企业微信外部群聊超过200人后，无法正常拉人进群，触发错误信息： “群聊人数已达上限，无法邀请新的联系人加入”

#### 退出企业微信

- 企业微信手动退出后，错误提示消息： “你已在手机上退出企业微信”
- 企业微信在其他电脑登陆后，错误提示消息： “你已在其他电脑登录，请重新登录。”

#### TOBE CHECK

- 企业微信切换企业，错误提示消息： “”

## 说明

每次测试用例都新建一个文件夹，并在文件夹中创建README说明测试用例情况。

## 测试前准备

- 新建.env文件

```sh
PUPPET_DOCKER_VERSION=0.1.153

# only crash

TEST_NAME=RUI
DURATION_MM=30

# receive and send, group_chat, 

CREATE_ROOM_NUM=5
CREATE_ROOM_TOPIC_TEMP=收发消息测试

SEND_CONTACT_ID=1688853462989866
SEND_CONTACT_NAME=机器人管家
RECEIVE_WECHAT_ID=1688850321595920
RECEIVE_WECHAT_NAME=RUI

# receive small image , flood-message

TOTAL=720


# only flood-message

roomName=群发测试1


# group-chat

CREATE_ROOM_TOPIC_TEMP=群测试
CREATE_ROOM_NUM=1

PICKUP_GROUP=测试群


```

- 在 utils 下新建 token.txt (至少两个循环用), token-for-crash.txt (测崩溃起多个token)
