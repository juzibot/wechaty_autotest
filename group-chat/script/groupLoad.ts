import * as fs from 'fs'
import { Wechaty, log, Message, Contact } from 'wechaty'
import { ScanStatus } from 'wechaty-puppet'
import { generate } from 'qrcode-terminal'
import * as dateformat from 'dateformat'
import { groupObj } from './constant';
import * as dotenv from 'dotenv'
import { createToken } from '../../utils/getToken'

dotenv.config({ path: '../../.env' })

const moment = require('moment');
const qr = require('qr-image');


let version = process.env.PUPPET_DOCKER_VERSION;

let readyFlag = false
let loginFlag = false

let loginTimestamp = 0
let qrcodeTimestamp = 0
let readyTimestamp = 0

let roomBeginTimestamp = 0

let roomEndTimestamp = 0

let bot = null
let token = ''

const reportData = []

createToken(version, `群聊加载 ${version}`).then((data: string) => {

  token = data;
  console.log(token);

  try {
    if (!fs.existsSync(`../result/${version}`)) {
      fs.mkdirSync(`../result/${version}`);
    }
    const access = fs.createWriteStream(`../result/${version}/${moment().format('MMDDHHmm')}-${version}-verbose-groupload-${token}.log`);
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
  reportData.push(['序号', '群名称', '实际人数', '加载人数', '结果']);
  reportData.push(['--', '--', '--', '--', '--']);

  bot = new Wechaty({
    puppet: 'wechaty-puppet-hostie',
    puppetOptions: {
      token,
    }
  });

  bot
    .on('scan', (qrcode, status) => {
      if (status === ScanStatus.Waiting) {
        qrcodeTimestamp = Date.now()
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
        loginTimestamp = Date.now()
      }
      log.info('LOGIN EVENT', `${user} login successfully!`)
    })

    .on('ready', async user => {

      // 计算最后一次ready 的时间
      readyTimestamp = Date.now()
      log.info('READY EVENT', `${bot.userSelf()} ready!`)

      if (!readyFlag) {
        readyFlag = true

        await sleep(10 * 1000)
        await printData()

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

const printData = async () => {

  if (!bot.logonoff()) {
    log.info('4-LOAD INFO', 'Bot not login')
    return
  }
  const rooms = await bot.Room.findAll()

  const roomCount = rooms.length

  const allResult = {}
  // sync room
  roomBeginTimestamp = Date.now()
  log.info('====== BEGIN SYNC ROOM ======')
  let seq = 1;
  for (const room of rooms) {
    await room.sync()
    const topic = await room.topic()
    console.log(`SYNC ROOM: ${room.id} ${topic}`)
    const memberlist = await room.memberList();
    allResult[topic] = memberlist.length;
    allResult[room.id] = memberlist.length;
    if (groupObj[topic] || groupObj[room.id]) {
      const origCount = groupObj[topic] || groupObj[room.id]
      reportData.push([seq, topic, origCount, allResult[topic], allResult[topic] >= origCount ? '正常' : '异常'])
      seq++
    }
  }

  roomEndTimestamp = Date.now()
  log.info('====== END SYNC ROOM ======')

  // 打印群列表
  // for (const room of rooms) {
  //   const member = await room.memberAll()
  //   // fs.appendFileSync(`./${FOLDER_NAME}/${token}/${token}.log`, `topic: ${await room.topic()}; member: ${member.length}\n`)
  //   console.log(`topic: ${await room.topic()}; member: ${member.length}`)
  // }

  log.info('4-LOAD INFO', `
  Room: ${roomCount}
  `)


  log.info('SYNC INFO', `
  Room: ${(roomEndTimestamp - roomBeginTimestamp) / 1000}s
  `)

  reportData.forEach((d) => {
    fs.appendFileSync(`../result/${version}/README.md`, d.join(' | ') + '\n');
  })
}


process.on('SIGTERM', () => {
  printData()
})

process.on('SIGINT', () => {
  printData()
})
