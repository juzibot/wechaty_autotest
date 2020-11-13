import * as fs from 'fs'
import { Wechaty, log, Message, Contact } from 'wechaty'
import { ScanStatus } from 'wechaty-puppet'
import { generate } from 'qrcode-terminal'
import * as dateformat from 'dateformat'
import * as dotenv    from 'dotenv'

const qr = require('qr-image');

const moment = require('moment');

dotenv.config({ path: '../../.env' })

const token = process.env.TOKEN
const NO = process.env.NO
const TEST_NAME = process.env.TEST_NAME
const version = process.env.PUPPET_DOCKER_VERSION
const duration = process.env.DURATION_MM
const FOLDER_NAME = `../result/${version}`

if (!fs.existsSync(FOLDER_NAME)){
  fs.mkdirSync(FOLDER_NAME);
}
const md = fs.createWriteStream(`./${FOLDER_NAME}/README.md`, {
  flags: 'a' // 'a' means appending (old data will be preserved)
})

const append = (arr: string[]) => {
  md.write(arr.join(' | ') + '\n');
}

if (`${NO}` === '1') {
  append([''])
  append([`**账号: ${TEST_NAME}**`])
  append([''])
  append([`**时间: ${moment().format('YYYY-MM-DD HH:mm:ss')}**`])
  append(['']);
  append(['token', '扫码轮次', '结果', '输出日志', '备注']);
  append(['--', '--', '--', '--', '--']);
}


log.info(`===================== NO ${NO}, TOKEN: ${token} BEGIN =====================`)

let readyFlag = false
let loginFlag = false
const eventSeqs = [];

const seqRes = (temp: string) => {
  const times = (temp.match(/scan\,login/g) || []).length
  const errorTimes = (temp.match(/ready\,ready/g) || []).length
  return [`${times}`, errorTimes > 0 ? `二次ready${errorTimes}次` : '正常', temp]
}

process.stdin.resume();

process.on('SIGINT', () => {
  log.info('Receive SIGINT, will do some stuff before process exit.')
  append([token, ...seqRes(eventSeqs.join(','))])
  process.exit(0)
})

process.on('SIGTERM', () => {
  log.info('Receive SIGTERM, will do some stuff before process exit.')
  append([token, ...seqRes(eventSeqs.join(','))])
  process.exit(0)
})

const startTimestamp = moment();
const exit = () => {
  if (startTimestamp.add(duration, 'minutes') <= moment()) {
    process.exit(0)
  }
}

const bot = new Wechaty({
  puppet: 'wechaty-puppet-hostie',
  puppetOptions: {
    token,
  }
});


try {
  const access = fs.createWriteStream(`./${FOLDER_NAME}/${moment().format('MMDDHHmm')}-${version}-verbose-${token}.log`);
  process.stdout.write = process.stderr.write = access.write.bind(access);
  process.stdout.pipe(access);
  process.stderr.pipe(access);
} catch (err) {
  log.error(err);
}

bot
  .on('scan', (qrcode, status) => {
    exit()
    eventSeqs.push('scan')
    try {
      if (status === ScanStatus.Waiting) {
        log.info('SCAN EVENT', '===== GET QRCODE =====')
        log.info(qrcode)
        fs.appendFileSync(`./${FOLDER_NAME}/event.txt`,`${token} ${dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss")} GET QRCODE!\n`)
  
        generate(qrcode, { small: true })
        const qr_img = qr.image(qrcode, { type: 'png' });
        qr_img.pipe(fs.createWriteStream(`./send_qrcodeImage/${moment().format('MMDDHHmmss')}.${version}.png`))
      }
    } catch (error) {
      console.log(`QRCODE GET ERROR!`)
      console.log(error)
      fs.appendFileSync(`./${FOLDER_NAME}/error.txt`,`${token} ${dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss")} QRCODE GET ERROR \nerrorListener\n Error happened:\n${error}\n`)
    }
  })

  .on('login', async user => {
    exit()
    eventSeqs.push('login')
    try {
      readyFlag = false
  
      // 防止因为 error 出现两次 login，计算第一次login的时间
      if (!loginFlag) {
        loginFlag = true
      }
      log.info('LOGIN EVENT', `${user} login successfully!`)
      fs.appendFileSync(`./${FOLDER_NAME}/event.txt`,`${token} ${dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss")} ${user} login successfully!\n`)
    } catch (error) {
      console.log(`LOGIN GET ERROR!`)
      console.log(error)
      fs.appendFileSync(`./${FOLDER_NAME}/error.txt`,`${token} ${dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss")} LOGIN GET ERROR \nerrorListener\n Error happened:\n${error}\n`)
    }
  })

  .on('ready', () => {
    exit()
    eventSeqs.push('ready')
    try {
      log.info('READY EVENT', `ready!`)
      fs.appendFileSync(`./${FOLDER_NAME}/event.txt`,`${token} ${dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss")} ready!@@@@@@@@@@@@@@@@@@@@@@@\n`)
  
      if (!readyFlag) {
        readyFlag = true
        console.log('############### READY DONE #################')
      }
    } catch (error) {
      console.log(`READY GET ERROR!`)
      console.log(error)
      fs.appendFileSync(`./${FOLDER_NAME}/error.txt`,`${token} ${dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss")} READY GET ERROR\nerrorListener\n Error happened:\n${error}\n`)
    }
  })
  
  .on('message', async (message: Message) => {
    exit()
    try {
      console.log(`GET MESSAGE EVENT: ${message}`)
      fs.appendFileSync(`./${FOLDER_NAME}/event.txt`,`${token} ${dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss")} MESSAGE EVENT! ${message}\n`)
    } catch (error) {
      console.log(`MESSAGE GET ERROR`)
      console.log(error)
      fs.appendFileSync(`./${FOLDER_NAME}/error.txt`,`${token} ${dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss")} MESSAGE GET ERROR\nerrorListener\n Error happened:\n${error}\n`)
    }
  })
  
  .on('error', async (error: Error) => {
    exit()
    eventSeqs.push('error')
    console.log(`======= ${token} ERROR EVENT =============`)
    log.error('ERROR EVNET', `${token} errorListener`, `Error happened:\n${error.stack}`)
    
    fs.appendFileSync(`./${FOLDER_NAME}/error.txt`,`${token} ${dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss")} EVENT ERROR\nerrorListener\n Error happened:\n${error.stack}\n`)
  })
  
  .on('logout', async (user: Contact, message: string) => {
    exit()
    eventSeqs.push('logout')
    try {
      log.info('LOGOUT EVENT', `${user} logout, reason: ${message}`)
      fs.appendFileSync(`./${FOLDER_NAME}/event.txt`,`${token} ${dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss")} ${user} logout, reason: ${message}\n`)
    } catch (error) {
      console.log(`LOGOUT GET ERROR `)
      console.log(error)
      fs.appendFileSync(`./${FOLDER_NAME}/error.txt`,`${token} ${dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss")} LOGOUT GET ERROR\nerrorListener\n Error happened:\n${error}\n`)
    }
  })
  .start()
  
 
  