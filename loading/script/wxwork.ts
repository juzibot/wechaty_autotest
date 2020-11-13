import * as fs from 'fs'
import { Wechaty, log, Message, Contact } from 'wechaty'
import { ScanStatus } from 'wechaty-puppet'
import { generate } from 'qrcode-terminal'
import * as dateformat from 'dateformat'
import * as dotenv from 'dotenv'
import { createToken } from '../../utils/getToken'

dotenv.config({ path: '../../.env' })

const moment = require('moment');
const qr = require('qr-image');


const version = process.env.PUPPET_DOCKER_VERSION;

let readyFlag = false
let loginFlag = false

const startTimestamp = Date.now()
let loginTimestamp = 0
let qrcodeTimestamp = 0
let readyTimestamp = 0

let innerContactBeginTimestamp = 0
let externalContactBeginTimestamp = 0
let otherContactBeginTimestamp = 0
let roomBeginTimestamp = 0

let innerContactEndTimestamp = 0
let externalContactEndTimestamp = 0
let otherContactEndTimestamp = 0
let roomEndTimestamp = 0


let bot = null
let token = ''

    createToken(version, `加载 ${version}`).then((data: string) => {

      token = data;
      console.log(token);

      try {
        if (!fs.existsSync(`../result/${version}`)){
          fs.mkdirSync(`../result/${version}`);
        }
        const access = fs.createWriteStream(`../result/${version}/${moment().format('MMDDHHmm')}-${version}-verbose-send-${token}.log`);
        process.stdout.write = process.stderr.write = access.write.bind(access);
        process.stdout.pipe(access);
        process.stderr.pipe(access);
      } catch (err) {
        log.error(err);
      }

      // reportData.push([''])
      // reportData.push([`**Token: ${token}**`])
      // reportData.push([''])
      // reportData.push([`**发送账号: ${SEND_CONTACT_NAME}**`])
      // reportData.push([''])
      // reportData.push([`**时间: ${moment().format('YYYY-MM-DD HH:mm:ss')}**`])
      // reportData.push(['']);
      // reportData.push(['接收人/群', '发送数量', '实际发送数量', '结果', '备注']);
      // reportData.push(['--', '--', '--', '--', '--']);

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
            fs.appendFileSync(`../result/${version}/event.txt`, `${dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss")} GET QRCODE!\n`)

            generate(qrcode, { small: true })
            const qr_img = qr.image(qrcode, { type: 'png' });
            qr_img.pipe(fs.createWriteStream(`./send_qrcodeImage/${moment().valueOf()}.${version}.png`))
          }
        })

        .on('login', async user => {
          readyFlag = false

          // 防止因为 error 出现两次 login，计算第一次login的时间
          if (!loginFlag) {
            loginFlag = true
            loginTimestamp = Date.now()
          }
          log.info('LOGIN EVENT', `${user} login successfully!`)
          fs.appendFileSync(`../result/${version}/event.txt`, `${dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss")} ${user} login successfully!\n`)
        })

        .on('ready', async user => {

          // 计算最后一次ready 的时间
          readyTimestamp = Date.now()
          log.info('READY EVENT', `${bot.userSelf()} ready!`)
          fs.appendFileSync(`../result/${version}/event.txt`, `${dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss")} ready!@@@@@@@@@@@@@@@@@@@@@@@\n`)

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
          fs.appendFileSync(`../result/${version}/event.txt`, `${dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss")} MESSAGE EVENT! ${message}\n`)
        })

        .on('error', async (error: Error) => {
          console.log(`======= ${bot.userSelf()} ERROR EVENT =============`)
          log.error('ERROR EVENT', `${bot.userSelf()} errorListener`, `Error happened:\n${error.stack}`)

          fs.appendFileSync(`../result/${version}/error.txt`, `${dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss")} EVENT ERROR\nerrorListener\n Error happened:\n${error.stack}\n`)
        })

        .on('logout', async (user: Contact, message: string) => {
          log.info('LOGOUT EVENT', `${user} logout, reason: ${message}`)

          fs.appendFileSync(`../result/${version}/event.txt`, `${dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss")} ${user} logout, reason: ${message}\n`)
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

  const contacts = await bot.Contact.findAll()
  const rooms = await bot.Room.findAll()

  const innerContactCount = contacts.filter(c => c.coworker() && c.friend()).length
  const externalContactCount = contacts.filter(c => !c.coworker() && c.friend()).length
  const otherContactCount = contacts.filter(c => !c.coworker() && !c.friend()).length
  const roomCount = rooms.length

  // sync Inner contact
  innerContactBeginTimestamp = Date.now()
  log.info('====== BEGIN SYNC Inner CONTACT ======')
  for (const contact of contacts.filter(c => c.coworker() && c.friend())) {
    // await contact.ready()
    console.log(`SYNC Inner CONTACT: ${contact.name()}`)
  }
  innerContactEndTimestamp = Date.now()
  log.info('====== END SYNC Inner CONTACT ======')

  // sync External contact
  externalContactBeginTimestamp = Date.now()
  log.info('====== BEGIN SYNC External CONTACT ======')
  for (const contact of contacts.filter(c => !c.coworker() && c.friend())) {
    // await contact.ready()
    console.log(`SYNC External CONTACT: ${contact.name()}`)
  }
  externalContactEndTimestamp = Date.now()
  log.info('====== END SYNC External CONTACT ======')

  // sync Other contact
  otherContactBeginTimestamp = Date.now()
  log.info('====== BEGIN SYNC Other CONTACT ======')
  for (const contact of contacts.filter(c => !c.coworker() && !c.friend())) {
    // await contact.ready()
    console.log(`SYNC Other CONTACT: ${contact.name()}`)
  }
  otherContactEndTimestamp = Date.now()
  log.info('====== END SYNC Other CONTACT ======')

  // sync room
  roomBeginTimestamp = Date.now()
  log.info('====== BEGIN SYNC ROOM ======')
  for (const room of rooms) {
    // await room.ready()
    console.log(`SYNC ROOM: ${await room.topic()}`)
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
  Inner contact: ${innerContactCount}
  External Contact: ${externalContactCount}
  Other Contact: ${otherContactCount}
  All Contacts: ${contacts.length}
  Room: ${roomCount}
  `)

  printTimes()

  log.info('SYNC INFO', `
  Inner contact: ${(innerContactEndTimestamp - innerContactBeginTimestamp) / 1000}s
  External Contact: ${(externalContactEndTimestamp - externalContactBeginTimestamp) / 1000}s
  Other Contact: ${(otherContactEndTimestamp - otherContactBeginTimestamp) / 1000}s 
  Room: ${(roomEndTimestamp - roomBeginTimestamp) / 1000}s
  `)

  console.log('for markdown stlye')
  console.log(`- token: ${token} \n`)
  console.log('Version |Qrcode | Ready| Inner | External | Other | Room | Inner | External | Other | Room | token | ')
  console.log('-- | -- | -- | -- | -- | --| --| --| --| --| --| -- ')
  console.log(`1 | ${(qrcodeTimestamp - startTimestamp) / 1000}s | ${(readyTimestamp - loginTimestamp) / 1000}s  | ${(innerContactEndTimestamp - innerContactBeginTimestamp) / 1000}s | ${(externalContactEndTimestamp - externalContactBeginTimestamp) / 1000}s | ${(otherContactEndTimestamp - otherContactBeginTimestamp) / 1000}s  | ${(roomEndTimestamp - roomBeginTimestamp) / 1000}s | ${innerContactCount}个 | ${externalContactCount}个 | ${otherContactCount}个 | ${roomCount}个 | ${token} |`)
  // fs.appendFileSync(`./${FOLDER_NAME}/README.md`, '次数 |Qrcode | Ready| Inner | External | Other | Room | Inner | External | Other | Room | token | \n')
  // fs.appendFileSync(`./${FOLDER_NAME}/README.md`, '-- | -- | -- | -- | -- | --| --| --| --| --| --| -- \n')
  fs.appendFileSync(`../result/${version}/README.md`, `${version} | ${(qrcodeTimestamp - startTimestamp) / 1000}s | ${(readyTimestamp - loginTimestamp) / 1000}s  | ${(innerContactEndTimestamp - innerContactBeginTimestamp) / 1000}s | ${(externalContactEndTimestamp - externalContactBeginTimestamp) / 1000}s | ${(otherContactEndTimestamp - otherContactBeginTimestamp) / 1000}s  | ${(roomEndTimestamp - roomBeginTimestamp) / 1000}s | ${innerContactCount}个 | ${externalContactCount}个 | ${otherContactCount}个 | ${roomCount}个 | ${token} |\n`)
}

const printTimes = () => {

  const result = `
  ============== Final Times ===============
  Qrcode event: ${(qrcodeTimestamp - startTimestamp) / 1000}s
  Ready event: ${(readyTimestamp - loginTimestamp) / 1000}s
  ============== Final Times ===============
    `
  log.info(result)
  // fs.appendFileSync(`./${FOLDER_NAME}/${token}/${token}.log`, `${dateFormat(Date.now(), "HH:MM:ss")} ${result}`)
}

process.on('SIGTERM', () => {
  printTimes()
})
