var computerIP = '192.168.2.57'
var port = '3789' // 默认端口3789, 可指定别的端口
var projectName = 'receive_qrcodeImage'

var newImage = '';

var stateStorage = storages.create('receive_imageVersion');
// events.on("exit", function(){
//     stateStorage.put("receive_currentImage", '');
// });

try {
  downLoad(projectName)
} catch (err) {
  console.log(err)
}
sleep(2000)
runProject()
function runProject() {
    var filePath = files.join(files.getSdcardPath(), '脚本', '', 'wework.js')
    console.log('filePath=')
    console.log(filePath)
    const currentImage = stateStorage.get("receive_currentImage", '') 
    console.log('current ', currentImage, 'newImage', newImage)
    if (currentImage !== newImage) {
      stateStorage.put("receive_currentImage", newImage);
      engines.execScriptFile(filePath, { path: files.join(files.getSdcardPath(), '脚本', projectName) })
    }
}
function downLoad(projectName) {
    var projectFileList = getProjectFileList(projectName)
    log('projectFileList=')
    log(projectFileList)
    // projectFileList.map(filePath => {
    //     downloadFile(filePath)
    // })
    if (projectFileList.length) {
      downloadFile(projectFileList[projectFileList.length - 1])
    }
  }

function downloadFile(filePath) {
    var url = util.format('http://%s:%s/fileSync/project/file/%s', computerIP, port, filePath)
    url = url.replace(/\s/g, '')
    console.log(url)
    var r = http.get(url)
    r = r.body.bytes()
    console.log('download file = ', filePath)
    newImage = filePath.split('/')[1]
    files.createWithDirs(filePath)
    files.writeBytes(filePath, r)
    const res = files.copy(filePath, '../DCIM/000qrcode.png')
    console.log('move ', res);
}
function getProjectFileList(projectName) {
    var url = util.format('http://%s:%s/fileSync/project/fileList/', computerIP, port, projectName)
    url = url.replace(/\s/g, '')
    console.log(url)
    var r = http.get(url)
    r = r.body.json()
    return r
}
