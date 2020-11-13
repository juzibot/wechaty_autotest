import * as fs from 'fs'
import { Wechaty, log, Message, Contact, FileBox, Room, UrlLink } from 'wechaty'
import { ScanStatus } from 'wechaty-puppet'
import { generate } from 'qrcode-terminal'
import { ContactIdList, getContacts, sleep, images, files, rawMaterialObj } from '../../utils/toolset'
import * as dotenv from 'dotenv'
import { createToken } from '../../utils/getToken';


const moment = require('moment');
const qr = require('qr-image');
const autojsFileSync = require('autojs-filesync')

console.log('autojsFileSync 开始')
try {
  autojsFileSync.start()
} catch (err) {
  console.log('start ', err)
}

async function stop () {
  await sleep(15000)
  console.log('autojsFileSync 停止')
  autojsFileSync.stop()
}

dotenv.config({ path: '../../.env' })

const { RECEIVE_WECHAT_ID, RECEIVE_WECHAT_NAME, PUPPET_DOCKER_VERSION } = process.env;
const SEND_ROOM_NUM = Number(process.env.SEND_ROOM_NUM)
const CREATE_ROOM_TOPIC_TEMP = process.env.CREATE_ROOM_TOPIC_TEMP
let personalWechatContact: Contact
let readyFlag = false

const reportData = [];
const messageResult = {};
const helperIdList: ContactIdList[] = JSON.parse(fs.readFileSync('./helper-contact.json').toString())

let version = PUPPET_DOCKER_VERSION;
let token = '';
let bot = null;

createToken(version, `发消息 ${version}`).then((data: string) => {

  token = data;
  console.log(token);

  try {
    if (!fs.existsSync(`../result/${version}`)){
      fs.mkdirSync(`../result/${version}`);
    }
    const access = fs.createWriteStream(`../result/${version}/${moment().format('HHmmss')}-${version}-verbose-send-${token}.log`);
    process.stdout.write = process.stderr.write = access.write.bind(access);
    process.stdout.pipe(access);
    process.stderr.pipe(access);
  } catch (err) {
    log.error(err);
  }

  reportData.push([''])
  reportData.push([`Token: ${token}`])
  reportData.push([`Version: ${version}`])
  reportData.push([`Time: ${moment().format('YYYY-MM-DD HH:mm:ss')}`])
  reportData.push(['']);
  reportData.push(['接收人/群', '发送数量', '实际发送数量', '结果', '备注']);
  reportData.push(['--', '--', '--', '--', '--']);

  console.log(`======== 这是用来验证【批量发送消息】情况的机器人, token: ${token} ========`)
  console.log(`======== READY 事件之后，会自动执行批量发送消息的任务 ========`)

  bot = new Wechaty({
    puppet: 'wechaty-puppet-hostie',
    puppetOptions: { token }
  })

  bot
    .on('scan', (qrcode, status) => {
      if (status === ScanStatus.Waiting) {
        log.info('QRCODE EVENT', `===== 企业微信扫码登陆 =====`)
        generate(qrcode, { small: true })
        const qr_img = qr.image(qrcode, { type: 'png' });
        qr_img.pipe(fs.createWriteStream(`./send_qrcodeImage/${moment().valueOf()}.${version}.png`))
      }
    })

    .on('login', async user => {
      log.info('LOGIN EVENT', `${user} login successfully!`)
    })

    .on('logout', async (user: Contact, message: string) => {
      log.info('LOGOUT EVENT', `${user} logout, reason: ${message}`)
    })

    .on('ready', async () => {
      log.info('READY EVNET', `${bot.userSelf()} ready!`)

      try {

        // TODO: readyFlag 是一个 workaround 的方案。两次ready就会跑两次，暂时用flag处理，但是会引发其他问题
        // if (!readyFlag) {
        readyFlag = true
        while (true) {
          await sendMessage()
        }
        // }
      } catch (error) {
        console.log(error)
      }
    })

    .on('message', async (message: Message) => {
      // log.info(`RECEIVE  ${recCount++} ${JSON.stringify(message)}`)

    })

    .on('error', async (error: Error) => {
      log.error('errorListener', `Error happened:\n${error.stack}`)
    })
    .start()

}).catch(err => {
  console.log('create token err', err)
})


const sendMessage = async () => {

  const contacts = await getContacts(helperIdList, bot)
  const receiveContact = await getContacts([{
    name: RECEIVE_WECHAT_NAME,
    id: RECEIVE_WECHAT_ID,
  }], bot)
  log.info(`============ Begin send message to ${helperIdList.length} contacts.============ \nContactList: ${contacts}! `)
  for (const contact of receiveContact) {
    if (!messageResult[contact.toString()]) {
      messageResult[contact.toString()] = [];
    }
    for (const key of Object.keys(rawMaterialObj['Text'])) {
      await sendText(contact, rawMaterialObj['Text'][key], `Text-${key}`)
    }
    for (const image of images()) {
      await sayFile(contact, image.url, image.name)
    }
    for (const file of files()) {
      await sayFile(contact, file.url, file.name)
    }

    await sendUrlLink(contact)
  }
  log.info(`########### End send message to ${helperIdList.length} contacts! ###########`)

  await sleep(2 * 1000)

  const rooms = await verifyPersonalWechat(contacts)
  log.info(`============ Begin send message to ${SEND_ROOM_NUM} rooms! ============`)
  for (const room of rooms) {
    if (!messageResult[room.toString()]) {
      messageResult[room.toString()] = [];
    }
    for (const key of Object.keys(rawMaterialObj['Text'])) {
      await sendText(room, rawMaterialObj['Text'][key], `Text-${key}`)
    }
    for (const image of images()) {
      await sayFile(room, image.url, image.name)
    }
    for (const file of files()) {
      await sayFile(room, file.url, file.name)
    }
    await sendUrlLink(room)
  }
  log.info(`########### End send message to ${SEND_ROOM_NUM} rooms! ###########`)

}

const sendText = async (sender: Contact | Room, text, name) => {
  const sendRes = [sender.toString(), text];
  try {
    log.info('SEND MESSAGE', `content: ${name} sender: ${sender}`)
    await sender.say(text)
    sendRes.push('正常');
    messageResult[sender.toString()].push(name);
    await sleep(0.5 * 1000)
  } catch (error) {
    log.error(`SEND TEXT MESSAGE ERROR! `, `${sender} content: ${text}; id:  ${sender.id}`)
    console.log(error)
    sendRes.push('失败');
    // reportData.push(sendRes);
  }
}

const sayFile = async (sender: Contact | Room, url: string, name: string) => {
  const sendRes = [sender.toString(), name];
  try {
    log.info('SEND MESSAGE', `content: ${name} sender: ${sender}`)
    await sender.say(FileBox.fromUrl(url, name))
    sendRes.push('正常');
    messageResult[sender.toString()].push(name);
    await sleep(1 * 1000)
  } catch (error) {
    log.error(`SEND FILE MESSAGE ${name} ERROR! `, `${sender} content: ${url}; id:  ${sender.id}`)
    console.log(error)
    sendRes.push('失败');
    // reportData.push(sendRes);
  }
}

const sendUrlLink = async (sender: Contact | Room) => {
  const urlLink = new UrlLink(rawMaterialObj['Url'])
  const sendRes = [sender.toString(), urlLink];
  try {
    log.info('SEND MESSAGE', `content: URL_LINK sender: ${sender}`)
    await sender.say(urlLink)
    sendRes.push('正常');
    messageResult[sender.toString()].push(urlLink);
    await sleep(0.5 * 1000)
  } catch (error) {
    log.error('SEND URLINK MESSAGE ERROR! ', `${sender} content: ${rawMaterialObj['Url']}; id:  ${sender.id}`)
    console.log(error)
    sendRes.push('失败');
    // reportData.push(sendRes);
  }
}

// 确认接收方的个人微信都在要测试的企业微信群中
const verifyPersonalWechat = async (helpContacts: Contact[]): Promise<Room[]> => {
  personalWechatContact = bot.Contact.load(RECEIVE_WECHAT_ID)
  await personalWechatContact.sync()

  const rooms: Room[] = []
  log.info(`开始确认接收方的个人微信是否都在要测试的企业微信中，群名称模板为: ${CREATE_ROOM_TOPIC_TEMP}`)
  for (let i = 1; i <= SEND_ROOM_NUM; i++) {
    // const tempRooms = await bot.Room.findAll({topic: CREATE_ROOM_TOPIC_TEMP + i})

    const tempRooms = await workaround(CREATE_ROOM_TOPIC_TEMP + i)
    // log.info(`${tempRooms}, id: ${tempRooms[0].id}`)

    if (tempRooms.length === 0) {
      log.info(`======= ${CREATE_ROOM_TOPIC_TEMP + i} 群不存在，开始创建该群 =======`)
      const room = await bot.Room.create(helpContacts, CREATE_ROOM_TOPIC_TEMP + i)
      if (room) {
        await room.say(`Room ${CREATE_ROOM_TOPIC_TEMP + i} Created!`)
        tempRooms.push(room)
      } else {
        throw Error('创建群聊失败！')
      }
    }

    // 确认个微在
    if (!await tempRooms[0].has(personalWechatContact)) {
      if (tempRooms[0].id.length > 12) {
        // 外部群
        log.info(`======= 个微不在 ${CREATE_ROOM_TOPIC_TEMP + i} 群，正在拉入群中 =======`)
        await tempRooms[0].add(personalWechatContact)
      } else {
        // 内部群
        log.info(`======= ${CREATE_ROOM_TOPIC_TEMP + i} 群为内部群，创建一个新的外部群 =======`)
        const room = await bot.Room.create(helpContacts, CREATE_ROOM_TOPIC_TEMP + i)
        if (room) {
          await room.say(`Room ${CREATE_ROOM_TOPIC_TEMP + i} Created!`)
        } else {
          log.error('创建群聊失败！')
        }
      }
      await sleep(5 * 1000)
    }

    rooms.push(tempRooms[0])
  }

  return rooms
}

const workaround = async (targetTopic: string): Promise<Room[]> => {
  const allRooms = await bot.Room.findAll()

  const rooms: Room[] = []
  for (const room of allRooms) {
    const topic = await room.topic()
    if (topic === targetTopic) {
      rooms.push(room)
    }
  }

  return rooms
}

const printResult = () => {
  // const buffer = xlsx.build([{ name: `${version}`, data: reportData }]); // Returns a buffer
  // fs.writeFileSync(`./result/发消息报告-${version}.xlsx`, buffer);
  for (const r in messageResult) {
    reportData.push([r, 41, messageResult[r].length, messageResult[r].length === 41 ? '正常' : '异常'])
  }
  reportData.forEach((d) => {
    fs.appendFileSync(`../result/${version}/发消息报告.md`, d.join(' | ') + '\n');
  })
}

process.on('unhandledRejection', (err) => {
  console.log('unhandledRejection', err);
})

process.on('uncaughtException', (err) => {
  console.log('uncaughtException', err)
  stop();
  printResult();

  log.info('EXIT', 'TASK DONE')
})


process.on('SIGINT', (err) => {
  console.log(err);
  stop();
  printResult();

  log.info('EXIT', 'TASK DONE')
})
