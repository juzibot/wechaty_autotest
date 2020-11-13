import { Wechaty, log, Message, Contact, FileBox } from 'wechaty'
import * as md5File  from 'md5-file'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

dotenv.config()

export interface ContactIdList {
  name: string,
  id:   string
}

export const getContacts = async (idList: ContactIdList[], bot: Wechaty): Promise<Contact[]> => {
  const contacts: Contact[] = []
  for (const idObject of idList) {
    const contact = bot.Contact.load(idObject.id)
    await contact.sync()
    contacts.push(contact)
  }
  return contacts
}

export const sleep = async (timeout: number) => {
  await new Promise(resolve => setTimeout(resolve, timeout))
}

export interface FileMaterial {
  type: 'Image' | 'Attachment' | 'Video',
  name: string,
  url: string,
  hash?: string,
}

// 得到所有的要发送的素材清单
export const rawMaterialObj = JSON.parse(fs.readFileSync('./file.json').toString())

// 为了send-message.ts
export const images = (): FileMaterial[]  => {
  const result: FileMaterial[] = []

  generatePureFileMaterial(result, 'Image', 'png')
  generatePureFileMaterial(result, 'Image', 'jpg')
  generatePureFileMaterial(result, 'Image', 'jpeg')

  return result
}

export const files = (): FileMaterial[]  => {
  const result: FileMaterial[] = []

  generatePureFileMaterial(result, 'Attachment', 'txt')
  generatePureFileMaterial(result, 'Attachment', 'doc')
  generatePureFileMaterial(result, 'Attachment', 'xlsx')
  generatePureFileMaterial(result, 'Attachment', 'ppt')
  generatePureFileMaterial(result, 'Attachment', 'pdf')

  return result
}

export const videos = (): FileMaterial[] => {
  const result: FileMaterial[] = []

  generatePureFileMaterial(result, 'Video', 'mp4')
  
  return result
}

export const generatePureFileMaterial = (result: FileMaterial[], type: 'Image' | 'Attachment' | 'Video', subType: string) => {
  Object.keys(rawMaterialObj[type][subType]).map(key => {
    result.push({
      type: type,
      name:  `${type}-${subType}-${key}.${rawMaterialObj[type][subType][key].match(/[^.]*$/)[0]}`,
      url: rawMaterialObj[type][subType][key]
    })
  })
}

// 为了receive-message.ts
