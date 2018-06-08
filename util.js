const cp = require('child_process')
const path = require('path')

function functionId (method, path) {
  return `${method.toUpperCase()}-${path.slice(1).replace('/')}`
}

function eventFunctionId (event) {
  return `EVENT-${event}`
}

function spawn (cmd, args, opts) {
  console.log('exec', cmd, args.join(' '))
  return new Promise((resolve, reject) => {
    let child = cp.spawn(cmd, args, opts)
    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)
    child.on('exit', (code, signal) => {
      if (code !== 0) {
        return reject(code)
      }

      resolve(code)
    })
  })
}

function exec (cmd) {
  console.log('exec', cmd)
  return new Promise((resolve, reject) => {
    cp.exec(cmd, function (err, stdout, stderr) {
      if (err) {
        err.stdout = stdout
        err.stderr = stderr
        return reject(err)
      }

      return resolve({ stdout, stderr })
    })
  })
}

function serviceName (imagePath) {
  return path.basename(imagePath.split(':')[0])
}

module.exports = { functionId, eventFunctionId, exec, spawn, serviceName }
