import * as fs from 'fs'
import { Wechaty, log, Message, Contact, Room } from 'wechaty'
import { ScanStatus } from 'wechaty-puppet'
import { generate } from 'qrcode-terminal'
import * as dateformat from 'dateformat'
import * as dotenv from 'dotenv'
import { createToken } from '../../utils/getToken'

dotenv.config({ path: '../../.env' })


const moment = require('moment');
const qr = require('qr-image');

const CREATE_ROOM_NUM = Number(process.env.CREATE_ROOM_NUM)
const { CREATE_ROOM_TOPIC_TEMP, PICKUP_GROUP, PUPPET_DOCKER_VERSION } = process.env

let version = PUPPET_DOCKER_VERSION;
let FOLDER_NAME = `../result/${version}`


let readyFlag = false
let loginFlag = false

let bot = null
let token = ''

const personGroup = '个微拉群测试'
let NF = null

const reportData = []


createToken(version, `群异常${version}`).then((data: string) => {

  token = data;
  console.log(token);

  try {
    if (!fs.existsSync(FOLDER_NAME)){
      fs.mkdirSync(FOLDER_NAME);
    }
    const access = fs.createWriteStream(`${FOLDER_NAME}/${moment().format('MMDDHHmm')}-${version}-verbose-groupexception-${token}.log`);
    process.stdout.write = process.stderr.write = access.write.bind(access);
    process.stdout.pipe(access);
    process.stderr.pipe(access);
  } catch (err) {
    log.error(err);
  }

  reportData.push([''])
  reportData.push([`**Token: ${token}**`])
  reportData.push([''])
  reportData.push([`**时间: ${moment().format('YYYY-MM-DD HH:mm:ss')}**`])
  reportData.push(['']);
  reportData.push(['群名称', '创建人数', '拉X入群后人数', '踢Y出群后人数','拉NF', '踢NF', '修改群名', '再次拉X', '再次踢Y', '个微群测试']);
  reportData.push(['--', '--', '--', '--', '--', '--', '--', '--', '--', '--']);

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
        qr_img.pipe(fs.createWriteStream(`./send_qrcodeImage/${moment().valueOf()}.${version}.png`))
      }
    })

    .on('login', async user => {
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
      fs.appendFileSync(`./${FOLDER_NAME}/error.txt`, `${dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss")} EVENT ERROR\nerrorListener\n Error happened:\n${error.stack}\n`)
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
          member.unshift(m)  // 创建群包括10个微信，看是否超时
        } else {
          member.push(m)
        }
        person++
      } else {
        member.push(m)
      }
      log.info(`${m.id} ${m.name()} ${m.type()}`)
    } else if (!m.friend()) {
      NF = m;
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

  if (contacts.length < 5) {
    log.info('选定的群成员数量请大于5')
    return;
  }

  // must exclude X, for testing add member to group
  const X = contacts.shift();
  // must include Y, for testing del member from group
  const Y = contacts[0];

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
      if (contacts.length > 5) {
        room = await bot.Room.create(contacts.slice(0, 5), CREATE_ROOM_TOPIC_TEMP + i)
        for (const r of contacts.slice(5, 10)) {
          try {
            await room.add(r);
          } catch (err) {
            log.error(`add contact ${r.id} error ${JSON.stringify(err)}`)
          }
          
        }
      } else {
        room = await bot.Room.create(contacts, CREATE_ROOM_TOPIC_TEMP + i)
      }
      if (room) {
        await room.say(`Room ${CREATE_ROOM_TOPIC_TEMP + i} Created!`)
        tempRooms.push(room)
        data.push((await room.memberList()).length)
      } else {
        log.error(`创建群聊 ${CREATE_ROOM_TOPIC_TEMP + i} 失败`)
      }
    }

    // add X
    if (!await tempRooms[0].has(X)) {
      log.info(`======= X${await X.name()}不在 ${CREATE_ROOM_TOPIC_TEMP + i} 群，正在拉入群中 =======`)
      if (tempRooms[0].id.length > 12) {
        // 外部群
        try {
          await tempRooms[0].add(X)
        } catch (err) {
          log.error(`add X ${X.id} error ${JSON.stringify(err)}`)
        }
        data.push((await tempRooms[0].memberAll()).length)
      } else {
        // 内部群
        log.info(`======= ${CREATE_ROOM_TOPIC_TEMP + i} 群为内部群，创建一个新的外部群 =======`)
        let room = null;
        if (contacts.length > 5) {
          room = await bot.Room.create(contacts.slice(0, 5), CREATE_ROOM_TOPIC_TEMP + i)
          for (const r of contacts.slice(5, 10)) {
            try {
              await room.add(r);
            } catch (err) {
              log.error(`add contact ${r.id} error ${JSON.stringify(err)}`)
            }
          }
        } else {
          room = await bot.Room.create(contacts, CREATE_ROOM_TOPIC_TEMP + i)
        }
        if (room) {
          await room.say(`Room ${CREATE_ROOM_TOPIC_TEMP + i} Created!`)
          try {
            await room.add(X);
          } catch (err) {
            log.error(`add X ${X.id} error ${JSON.stringify(err)}`)
          }
          data.push((await room.memberList()).length)
        } else {
          log.error(`创建群聊 外部群 ${CREATE_ROOM_TOPIC_TEMP + i} 失败`)
        }
      }
      await sleep(5 * 1000)
    }


    // del Y
    if (await tempRooms[0].has(Y)) {
      log.info(`======= Y${await Y.name()}在 ${CREATE_ROOM_TOPIC_TEMP + i} 群，正在踢出群中 =======`)
      
      try {
        await tempRooms[0].del(Y);
      } catch (err) {
        log.error(`del contact ${Y.id} error ${JSON.stringify(err)}`)
      }
    }
    data.push((await tempRooms[0].memberAll()).length)


    // add NF
    try {
      await tempRooms[0].add(NF)
      data.push('')
    } catch (err) {
      log.error(`add NF error ${JSON.stringify(err)}`)
      data.push(`拉NF入群报错 ${err.message}`)
    }

    // del NF
    try {
      await tempRooms[0].del(NF)
      data.push('')
    } catch (err) {
      log.error(`del NF error ${JSON.stringify(err)}`)
      data.push(`踢NF出群报错 ${err.message}`)
    }

    // update topic
    await tempRooms[0].topic(`test${await tempRooms[0].topic()}`)

    await tempRooms[0].say(`topic updated!`)

    data.push(await tempRooms[0].topic())

    // add X again
    try {
      await tempRooms[0].add(X)
      data.push('')
    } catch (err) {
      log.error(`add X ${X.id} error ${JSON.stringify(err)}`)
      data.push(`重复拉X入群报错 ${err.message}`)
    }

    // del Y again
    try {
      await tempRooms[0].del(Y)
      data.push('')
    } catch (err) {
      log.error(`del Y ${Y.id} error ${JSON.stringify(err)}`)
      data.push(`重复踢Y出群报错 ${err.message}`)
    }


    // test group owner is weixin, then the member total should not greater than 20
    const weixinOwnerGroup = await bot.Room.findAll({ topic: personGroup })
    let weixinErr = false;
    if (!weixinOwnerGroup) {
      log.error(`${personGroup} is not exist yet`)
      data.push(`${personGroup}不存在`)
      weixinErr = true
    } else {
      const weixinGroupMemberList = await weixinOwnerGroup[0].memberAll()
      if (weixinGroupMemberList.length < 20) {
        const addContacts = contacts
        for (const c of addContacts) {
          try {
            if (!await weixinOwnerGroup[0].has(c)) {
              await weixinOwnerGroup[0].add(c)
            }
          } catch (err) {
            data.push(`${personGroup}添加成员报错${err.message}`)
            weixinErr = true
          }
        }
      } else {
        data.push(`${personGroup}人数已经大于20了`)
        weixinErr = true
      }
    }
    if (!weixinErr) {
      data.push('')
    }
    

    // if(data[1] === data[3]) {
    //   data.push('正常')
    // } else {
    //   data.push('异常')
    // }

    reportData.push(data);

    // 解散群聊
  }
}

const printResult = () => {
  reportData.forEach((d) => {
    fs.appendFileSync(`${FOLDER_NAME}/README-Operation.md`, d.join(' | ') + '\n');
  })
}


process.on('SIGTERM', () => {
  printResult()
})

process.on('SIGINT', () => {
  printResult()
})
