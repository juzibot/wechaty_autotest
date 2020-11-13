const autojsFileSync = require('autojs-filesync')

console.log('autojsFileSync 开始')
try {
  autojsFileSync.start()
} catch(err) {
  console.log('start ', err)
}
