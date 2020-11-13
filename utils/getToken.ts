
const fs = require('fs');

export const createToken = (version, remark) => {
  
  return new Promise( (resolve, reject) => {
    try {
      // read contents of the file
      const data = fs.readFileSync('../../utils/token.txt', 'UTF-8');
  
      // split the contents by new line
      const lines = data.split(/\r?\n/);
  
      let token: string = ''
      // move first line to the end of line
      if (lines.length) {
        const current = lines[0]
        lines.push(current)
        lines.shift()
        token = current
      } 
      fs.writeFileSync(`../../utils/token.txt`, lines[0] + '\n', { flag: 'w' })
      lines.slice(1).forEach(v => {
        if (v) {
          fs.writeFileSync(`../../utils/token.txt`, v + '\n', { flag: 'a' })
        }
      })
      console.log(`${version} ${remark} get token ${token}`)
      resolve(token)
    } catch (err) {
      console.error(err);
      reject(err)
    }
  })
  

}
