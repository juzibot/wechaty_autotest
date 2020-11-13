import * as fs from 'fs'
import { Wechaty, log, Message, Contact, Room } from 'wechaty'
import { ScanStatus } from 'wechaty-puppet'
import { generate } from 'qrcode-terminal'
import * as dateformat from 'dateformat'
import * as dotenv from 'dotenv'
import { createToken } from '../../utils/getToken'

dotenv.config({ path: '../../.env'})


const Redis = require("ioredis");
const redis = new Redis(); // uses defaults unless given configuration object

const moment = require('moment');
const qr = require('qr-image');

const { CREATE_ROOM_TOPIC_TEMP, PICKUP_GROUP, PUPPET_DOCKER_VERSION } = process.env

const CREATE_ROOM_NUM = Number(process.env.CREATE_ROOM_NUM)
const version = PUPPET_DOCKER_VERSION

let readyFlag = false
let loginFlag = false

let bot = null
let token = ''
const reportData = []

const updateCount = 18

createToken(version, `群操作${version}`).then((data: string) => {

  token = data;

  try {

    if (!fs.existsSync(`../result/${version}`)){
      fs.mkdirSync(`../result/${version}`);
    }
    const access = fs.createWriteStream(`../result/${version}/${moment().format('MMDDHHmm')}-${version}-verbose-groupop-${token}.log`);
    process.stdout.write = process.stderr.write = access.write.bind(access);
    process.stdout.pipe(access);
    process.stderr.pipe(access);
  } catch (err) {
    log.error(err);
  }

  reportData.push([''])
  reportData.push([`**测试账号：TEST_NAME**`])
  reportData.push([''])
  reportData.push([`**时间: ${moment().format('YYYY-MM-DD HH:mm:ss')}**`])
  reportData.push(['']);
  reportData.push(['群名称', '建群人数', '预计拉群人数', '实际拉群人数', '预计踢群人数', '实际踢群人数', '修改群名', '结果']);
  reportData.push(['--', '--', '--', '--', '--', '--', '--', '--']);

  bot = new Wechaty({
    puppet: 'wechaty-puppet-hostie',
    puppetOptions: {
      token,
    }
  });

  bot
    .on('scan', (qrcode, status) => {
      if (status === ScanStatus.Waiting) {
        log.info('SCAN EVENT', '===== GET QRCODE =====')

        generate(qrcode, { small: true })
        const qr_img = qr.image(qrcode, { type: 'png' });
        qr_img.pipe(fs.createWriteStream(`./receive_qrcodeImage/${moment().valueOf()}.${version}.png`))
      }
    })

    .on('login', async user => {
      reportData[1][0] = reportData[1][0].replace('TEST_NAME', user.toString())
      readyFlag = false

      // 防止因为 error 出现两次 login，计算第一次login的时间
      if (!loginFlag) {
        loginFlag = true
      }
      log.info('LOGIN EVENT', `${user} login successfully!`)
    })

    .on('ready', async user => {

      // 计算最后一次ready 的时间
      log.info('READY EVENT', `${bot.userSelf()} ready!`)

      if (!readyFlag) {
        readyFlag = true

        await sleep(10 * 1000)

        await batchCreateRoom()

        await printResult()

        await sleep(2 * 1000)
        log.info('EXIT', 'TASK DONE')
        process.exit(0)
      }
    })

    .on('message', async (message: Message) => {
      console.log(`GET MESSAGE EVENT: ${message}`)
    })

    .on('error', async (error: Error) => {
      console.log(`======= ${bot.userSelf()} ERROR EVENT =============`)
      log.error('ERROR EVNET', `${bot.userSelf()} errorListener`, `Error happened:\n${error.stack}`)
      fs.appendFileSync(`../result/${version}/error.txt`, `${dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss")} EVENT ERROR\nerrorListener\n Error happened:\n${error.stack}\n`)
    })

    .on('logout', async (user: Contact, message: string) => {
      log.info('LOGOUT EVENT', `${user} logout, reason: ${message}`)
    })
    .start()

})

const sleep = async (timeout: number) => {
  await new Promise(resolve => setTimeout(resolve, timeout))
}


let person = 0;
const getRoomMember = async (roomName: string) => {
  const room = await bot.Room.find({ topic: roomName })
  const memberlist = await room.memberList()
  const member = []
  for(const m of memberlist) {
    if (m.friend() && !m.self()) {
      if (m.type() === 1) {
        if (person < 2) {
          member.unshift(m)  // 创建群包括2个微信，看是否超时
        } else {
          member.push(m)
        }
        person++
      } else {
        member.push(m)
      }
      log.info(`${m.id} ${m.name()} ${m.type()}`)
    }
  }
  return member
}

const batchCreateRoom = async () => {

  if (!bot.logonoff()) {
    log.info('4-LOAD INFO', 'Bot not login')
    return
  }

  // pick up a big group chat , then create multiple groups with random number
  const roomName = PICKUP_GROUP
  const contacts = await getRoomMember(roomName);

  if (contacts.length < 20) {
    log.info('选定的群好友数量请大于20')
    return;
  }

  log.info(`群名称模板为: ${CREATE_ROOM_TOPIC_TEMP}`)
  for (let i = 1; i <= CREATE_ROOM_NUM; i++) {
    const data: any[] = [CREATE_ROOM_TOPIC_TEMP + i];
    const tempRooms = await bot.Room.findAll({topic: CREATE_ROOM_TOPIC_TEMP + i})
    log.info(`findAll ${CREATE_ROOM_TOPIC_TEMP + i} ${JSON.stringify(tempRooms)}`)

    // const tempRooms = await workaround(CREATE_ROOM_TOPIC_TEMP + i)
    // log.info(`${tempRooms}, id: ${tempRooms[0].id}`)

    if (tempRooms.length === 0) {
      log.info(`======= ${CREATE_ROOM_TOPIC_TEMP + i} 群不存在，开始创建该群 =======`)
      let room = null;
      room = await bot.Room.create(contacts.slice(0, 2), CREATE_ROOM_TOPIC_TEMP + i)
      data.push((await room.memberList()).length)
      for (const r of contacts.slice(2, 21)) {
        try {
          await room.add(r);
        } catch (err) {
          log.error(`add contact ${r.id} error ${JSON.stringify(err)}`)
        }
        
      }

      if (room) {
        await room.say(`Room ${CREATE_ROOM_TOPIC_TEMP + i} Created!`)
        tempRooms.push(room)
        data.push(updateCount)
        data.push((await room.memberList()).length - 3)
      } else {
        log.error(`创建群聊 ${CREATE_ROOM_TOPIC_TEMP + i} 失败`)
      }
    }

    for (const Y of contacts.slice(2, 21)) {
      if (await tempRooms[0].has(Y)) {
        log.info(`======= Y${await Y.name()}在 ${CREATE_ROOM_TOPIC_TEMP + i} 群，正在踢出群中 =======`)
        
        try {
          await tempRooms[0].del(Y);
        } catch (err) {
          log.error(`del contact ${Y.id} error ${JSON.stringify(err)}`)
        }
      }
    }
    data.push(updateCount)
    data.push((await tempRooms[0].memberAll()).length  + updateCount - 3)

    await tempRooms[0].topic(`test${await tempRooms[0].topic()}`)

    await tempRooms[0].say(`topic updated!`)

    data.push(await tempRooms[0].topic())

    if(data[1] === data[3]) {
      data.push('正常')
    } else {
      data.push('异常')
    }

    reportData.push(data);

    // 解散群聊
  }
}

const printResult = () => {
  reportData.forEach((d) => {
    fs.appendFileSync(`../result/${version}/README.md`, d.join(' | ') + '\n');
  })
}


process.on('SIGTERM', () => {
  printResult()
})

process.on('SIGINT', () => {
  printResult()
})
