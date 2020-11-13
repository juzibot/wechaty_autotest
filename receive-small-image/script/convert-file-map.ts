import * as md5File  from 'md5-file'
import { FileBox } from 'file-box'
import { FileMaterial, rawMaterialObj } from '../../utils/toolset'
import * as fs from 'fs'

interface fileMaterialObj { 
  [key: string]: FileMaterial 
}

const getFileMaterial = async(): Promise<fileMaterialObj> => {
  const result: FileMaterial[] = []
  const fileMaterialObj:fileMaterialObj = {}

  await generateHashFileMaterial(result, 'Image', 'png')
  await generateHashFileMaterial(result, 'Image', 'jpg')
  await generateHashFileMaterial(result, 'Image', 'jpeg')

  // await generateHashFileMaterial(result, 'Attachment', 'txt')
  // await generateHashFileMaterial(result, 'Attachment', 'doc')
  // await generateHashFileMaterial(result, 'Attachment', 'xlsx')
  // await generateHashFileMaterial(result, 'Attachment', 'ppt')
  // await generateHashFileMaterial(result, 'Attachment', 'pdf')

  // await generateHashFileMaterial(result, 'Video', 'mp4')

  console.log(result)

  result.map(material => fileMaterialObj[material.hash] = material)

  return fileMaterialObj
}

const generateHashFileMaterial = async (result: FileMaterial[], type: 'Image' | 'Attachment' | 'Video', subType: string) => {
  for (const key of Object.keys(rawMaterialObj[type][subType])) {
    const name = `${type}-${subType}-${key}.${rawMaterialObj[type][subType][key].match(/[^.]*$/)[0]}`
    console.log(`生成了文件 ${name} 的hash值！`)
    const url = rawMaterialObj[type][subType][key]

    await FileBox.fromUrl(url, name).toFile('./tmp/' + name,true)
    const hash = md5File.sync('./tmp/' + name)

    result.push({
      type,
      name,
      url,
      hash
    })
  }
}

async function main() {
  const fileMaterials = await getFileMaterial()
  console.log('############ 得到了所有图片和文件素材的hash值列表 ############')
  console.log(fileMaterials)
  fs.writeFileSync(`./file-hash.json`, JSON.stringify(fileMaterials))
}

main()
