import * as fs from 'fs'
import { Wechaty, log, Message, Contact, Room } from 'wechaty'
import { ScanStatus } from 'wechaty-puppet'
import { generate } from 'qrcode-terminal'
import * as md5File from 'md5-file'
import { RateManager } from '../../utils/rate-manager'
import xlsx from 'node-xlsx';
import * as dotenv from 'dotenv'
import { sleep, rawMaterialObj } from '../../utils/toolset'
import { createToken } from '../../utils/getToken'

const qr = require('qr-image');

dotenv.config({ path: '../../.env' })

const moment = require('moment');
const { SEND_CONTACT_ID, PUPPET_DOCKER_VERSION } = process.env;
const FILEHASH = process.env.FILEHASH || './file-hash.json'
let wxworkContact: Contact
const messageResult: { [key: string]: string[] } = {}
const rateManager = new RateManager()
const fileMaterials = JSON.parse(fs.readFileSync(FILEHASH).toString())

let ready = false;
let version = PUPPET_DOCKER_VERSION;
const roomName = '标签测试';
let token = '';
let bot = null;
const reportData = [];
let receiveMsgCount = 0;

const getRoomMember = async () => {
  const room = await bot.Room.find({ topic: roomName })
  await room.sync();
  return room.memberList()
}

let exitSignal = false;

createToken(version, `标签丢失 ${version}`).then((data: string) => {

  token = data;

  try {
    if (!fs.existsSync(`../result/${version}`)){
      fs.mkdirSync(`../result/${version}`);
    }
    const access = fs.createWriteStream(`../result/${version}/${moment().format('HHmmss')}-${version}-verbose-receive-${token}.log`);
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
  reportData.push(['联系人', '备注', '标签数量', '结果', '备注']);
  reportData.push(['--', '--', '--', '--', '--']);

  console.log(`======== 这是用来验证【收到消息】情况的机器人, token: ${token}  ========`)

  bot = new Wechaty({
    puppet: 'wechaty-puppet-hostie',
    puppetOptions: { token }
  })

  bot
    .on('scan', (qrcode, status) => {
      if (status === ScanStatus.Waiting) {
        log.info('QRCODE EVENT', `===== 微信个人号或者企业微信号扫码登陆 =====`)
        generate(qrcode, { small: true })
        const qr_img = qr.image(qrcode, { type: 'png' });
        qr_img.pipe(fs.createWriteStream(`./receive_qrcodeImage/${moment().valueOf()}.${version}.png`))
      }
    })

    .on('login', async user => {
      log.info('LOGIN EVENT', `${user} login successfully!`)
      wxworkContact = bot.Contact.load(SEND_CONTACT_ID)
      await wxworkContact.sync()
      const contactList = await getRoomMember();
      for (const contact of contactList) {
        await contact.sync();
        // await contact.phone(['444'])
        await contact.phone((await contact.phone()).concat([`444`]))
        await sleep(30 * 1000)
      }
      log.info('GET WXWORK CONTECT 要批量发消息的企业微信是:', `${wxworkContact}`)

    })

    .on('logout', async (user: Contact, message: string) => {
      log.info('LOGOUT EVENT', `${user} logout, reason: ${message}`)
    })

    .on('ready', async () => {
      log.info('READY EVENT', `${bot.userSelf()} ready!`)
      // await sleep(1 * 60 * 1000)
        const contactList = await getRoomMember();
        for (const contact of contactList) {
          await contact.sync();
          // await contact.phone(['444'])
          await contact.phone((await contact.phone()).concat([`444`]))
          reportData.push([contact.name(), await contact.alias(), 2])
          await sleep(30 * 1000)
        }
      ready = true;
      
    })

    .on('message', async (message: Message) => {
      // log.info(JSON.stringify(message));
      const contact = message.from()
      const room = message.room()
      const text = message.text()

      log.info(`${receiveMsgCount} ${JSON.stringify(message)}`)
      if (room) {
        await checkMessage(room, message)
      } else {
        await checkMessage(contact, message)
      }

      if (receiveMsgCount > 500) {
        await sleep(1 * 60 * 1000)
        exitSignal = true;
      }

      try {

        if (text === version) {
          log.info('TESTENDING:', `收到来自 ${contact} 的结束测试信息 ${text}, 将会在10s之后结束测试并将内容打印在 result 文件夹内`)
          await sleep(10 * 10)

          try {
            wxworkContact = bot.Contact.load(SEND_CONTACT_ID)
            await wxworkContact.say(version);
            exitSignal = true;

          } catch (err) {
            console.log(err)
          }
        }

        if (text === 'timeout') {
          log.info('test timeout:', `收到来自 ${contact} 的测试信息 ${text}`)
          await sleep(10 * 10)

          try {
            wxworkContact = bot.Contact.load(SEND_CONTACT_ID)
            await wxworkContact.say('test timeout');
            log.info('reply timeout successfully!!!')
          } catch (err) {
            log.info('reply timeout failed!!!')
            console.log(err)
          }
        }

      } catch (err) {
        console.log(err)
      }

      if (exitSignal) {
        printResult()
        log.info('EXIT', 'TASK DONE')
        process.exit(0)
      }

      // 验证是否一定是某个用户发的。
      // if (contact.id !== SEND_CONTACT_ID) {
      //   return
      // }

      
    })

    .on('error', async (error: Error) => {
      log.error('errorListener', `Error happened:\n${error.stack}`)
    })
    .start()
}).catch(err => {
  console.log('create token err', err)
})

const checkMessage = async (sender: Room | Contact, message: Message) => {
  const type = message.type()
  if (type === bot.Message.Type.Text && Object.values(rawMaterialObj['Text']).includes(message.text())) {
    const name = Object.keys(rawMaterialObj['Text']).find(key => rawMaterialObj['Text'][key] === message.text())
    log.info('RECEIVE MESSAGE', `content: ${name} sender: ${sender}`)
    setMessageMap(sender.toString(), name)

  } else if (type === bot.Message.Type.Attachment || type === bot.Message.Type.Image) {

    log.info(`get file message ${message.toString()}`)
    log.info(`Contact From: ${message.from()}`)
    try {
      wxworkContact = bot.Contact.load(SEND_CONTACT_ID)
      // await wxworkContact.say(`==== reply file or image ${message.from()} ======`);
      log.info('reply successfully!!!')
    } catch (err) {
      log.info('reply timeout', err);
    }

    try {
      const fileHash = await getHash(message)

      if (fileHash && fileMaterials[fileHash]) {
        const fileName = fileMaterials[fileHash].name
        log.info('RECEIVE MESSAGE', `content: ${fileName} sender: ${sender}`)
        setMessageMap(sender.toString(), fileName)
      } else {
        // reportData.push([sender.toString(), '', '失败'])
      }
    } catch (err) {
      console.log('getHash error', err)
    }

  } else if (type === bot.Message.Type.Url) {
    const urlLink = await message.toUrlLink()
    if (
      urlLink.description() === rawMaterialObj['Url']['description'] &&
      urlLink.thumbnailUrl() === rawMaterialObj['Url']['thumbnailUrl'] &&
      urlLink.title() === rawMaterialObj['Url']['title'] &&
      urlLink.url() === rawMaterialObj['Url']['url']
    ) {
      log.info('RECEIVE MESSAGE', `content: Url sender: ${sender}`)
      setMessageMap(sender.toString(), 'Url')
    }
  }
}

const setMessageMap = async (key: string, value: string) => {
  // reportData.push([key, value, '正常']);
  receiveMsgCount++;

  if (messageResult[key]) {
    messageResult[key].push(value)
  } else {
    messageResult[key] = [value]
  }
}

const getHash = async (m: Message): Promise<string> => {
  return rateManager.exec(async () => {
    try {
      const fileBox = await m.toFileBox()
      const timestamp = Date.now()
      log.info('after toFileBox', `${timestamp}-${fileBox.name.trim()}`, JSON.stringify(m))
      try {
        await fileBox.toFile(`./tmp/${timestamp}-${fileBox.name.trim()}`, true)
      } catch (err) {
        log.error('fileBox.toFile', JSON.stringify(m), err)
      }
      log.info('after fileBox.toFile', `${timestamp}-${fileBox.name.trim()}`, JSON.stringify(m))
      return md5File.sync(`./tmp/${timestamp}-${fileBox.name.trim()}`)
    } catch (error) {
      log.error(`get file error! ${JSON.stringify(m)}`)
      log.error('got error', error)
      return undefined
    }
  }, { queueId: 'download-file' })
}

const printResult = () => {
  reportData.forEach(d => {
    fs.appendFileSync(`../result/${version}/${moment().format('YYYY-MM-DD')}标签备注丢失报告.md`, d.join(' | ') + '\n')
  })
}


process.on('unhandledRejection', (err) => {
  console.log('unhandledRejection', err);
})

process.on('uncaughtException', (err) => {
  console.log('uncaughtException', err)
  printResult();
})

process.on('SIGINT', (err) => {
  console.log(err);
  printResult()
})
