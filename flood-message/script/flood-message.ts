import * as fs from 'fs'
import { Wechaty, log, Message, Contact, FileBox, Room, UrlLink } from 'wechaty'
import { ScanStatus } from 'wechaty-puppet'
import { generate } from 'qrcode-terminal'
import { sleep, images, files, videos, rawMaterialObj } from '../../utils/toolset'
import * as dotenv from 'dotenv'
import { createToken } from '../../utils/getToken';

const qr = require('qr-image');
const moment = require('moment');

dotenv.config({ path: '../../.env' })

const version = process.env.PUPPET_DOCKER_VERSION;
const roomName = process.env.roomName
const TOTAL = Number(process.env.TOTAL)
const reportData = [];
const messageResult = {};
const failResult = {};

let sendCount = 0;
let readyFlag = false
let i = 0;
let token = '';
let bot = null;

createToken(version, `群发消息 ${version}`).then((data: string) => {

  token = data;
  console.log(token);

  try {
    if (!fs.existsSync(`../result/${version}`)) {
      fs.mkdirSync(`../result/${version}`);
    }
    const access = fs.createWriteStream(`../result/${version}/${moment().format('MMDDHHmm')}-${version}-verbose-groupsend-${token}.log`);
    process.stdout.write = process.stderr.write = access.write.bind(access);
    process.stdout.pipe(access);
    process.stderr.pipe(access);
  } catch (err) {
    log.error(err);
  }
  reportData.push([''])
  reportData.push([`**Token: ${token}**`])
  reportData.push([''])
  reportData.push([`**发送账号: SEND_CONTACT_NAME**`])
  reportData.push([''])
  reportData.push([`**时间: ${moment().format('YYYY-MM-DD HH:mm:ss')}**`])
  reportData.push(['']);
  reportData.push([`**共计发送数：TOTAL**`])  // 7
  reportData.push(['']);
  reportData.push([`**实际发送数：REAL_TOTAL**`])
  reportData.push(['']);
  reportData.push([`**失败率：FAIL_RATE**`])
  reportData.push(['']);
  reportData.push(['接收人', '实际发送数量', '失败发送数量', '备注']);
  reportData.push(['--', '--', '--', '--']);


  console.log(`======== 这是用来验证【群发消息】情况的机器人, token: ${token} ========`)
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
      reportData[3][0] = reportData[3][0].replace('SEND_CONTACT_NAME', user.toString())
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
        const contactList = await getRoomMember();
        log.info(`${roomName} 成员 ${contactList.length} 个`)
        while (sendCount < TOTAL) {
          for (const contact of contactList.slice(1)) {
            await contact.ready();
            try {

              if (!messageResult[contact.toString()]) {
                messageResult[contact.toString()] = [];
              }
              if (!failResult[contact.toString()]) {
                failResult[contact.toString()] = []
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

              for (const v of videos()) {
                await sayFile(contact, v.url, v.name)
              }

              log.info(`${contact.name()} 发送成功`)
              await sleep(0.5 * 1000)
            } catch (err) {
              log.error(`${contact.name()} 发送失败 ${err}`)
            }
          }
        }


        printResult();
        await sleep(10 * 10)

        log.info('EXIT', 'TASK DONE')
        process.exit(0)
        // }
      } catch (error) {
        console.log(error)
      }
    })

    .on('message', async (message: Message) => {

    })

    .on('error', async (error: Error) => {
      log.error('errorListener', `Error happened:\n${error.stack}`)
    })
    .start()

}).catch(err => {
  console.log('create token err', err)
});

const getRoomMember = async () => {
  const room = await bot.Room.find({ topic: roomName })
  return room.memberList()
}

const sendText = async (sender: Contact | Room, text, name) => {
  const sendRes = [sender.toString(), text];
  if (sendCount >= TOTAL) {
    return;
  }
  sendCount++;
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
    failResult[sender.toString()].push(name);
    // reportData.push(sendRes);
  }
}

const sayFile = async (sender: Contact | Room, url: string, name: string) => {
  const sendRes = [sender.toString(), name];
  if (sendCount >= TOTAL) {
    return;
  }
  sendCount++;
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
    failResult[sender.toString()].push(name);
    // reportData.push(sendRes);
  }
}

const sendUrlLink = async (sender: Contact | Room) => {
  if (sendCount >= TOTAL) {
    return;
  }
  sendCount++;
  const urlLink = new UrlLink(rawMaterialObj['Url'])
  const sendRes = [sender.toString(), urlLink];
  try {
    log.info('SEND MESSAGE', `content: URL_LINK sender: ${sender}`)
    await sender.say(urlLink)
    sendRes.push('正常');
    messageResult[sender.toString()].push('URL');
    await sleep(0.5 * 1000)
  } catch (error) {
    log.error('SEND URLINK MESSAGE ERROR! ', `${sender} content: ${rawMaterialObj['Url']}; id:  ${sender.id}`)
    console.log(error)
    sendRes.push('失败');
    failResult[sender.toString()].push('URL');
    // reportData.push(sendRes);
  }
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
  let realSendCount = 0
  for (const r in messageResult) {
    if (!(messageResult[r].length && failResult[r].length)) {
      reportData.push([r, messageResult[r].length, failResult[r].length])
    }
    realSendCount += messageResult[r].length
  }
  console.log(messageResult);
  reportData[7][0] = reportData[7][0].replace('TOTAL', sendCount)
  reportData[9][0] = reportData[9][0].replace('REAL_TOTAL', realSendCount)
  reportData[11][0] = reportData[11][0].replace('FAIL_RATE', `${Math.round((sendCount - realSendCount) / sendCount * 100) / 100}%`)
  reportData.forEach((d) => {
    fs.appendFileSync(`../result/${version}/README.md`, d.join(' | ') + '\n');
  })
}

process.on('unhandledRejection', (err) => {
  console.log(err);
})

process.on('SIGINT', (err) => {
  console.log(err);
  printResult();
  log.info('EXIT', 'TASK DONE')
})
