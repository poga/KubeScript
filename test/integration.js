const tape = require('tape')
const fs = require('fs')
const path = require('path')
const { spawn } = require('../util')

try {
  fs.mkdirSync(path.join(__dirname, 'temp'))
} catch (e) {
  // ignore
}

tape('integration test', async function (t) {
  let env = Object.assign({ 'KUBESCRIPT_PHASE': 'build' }, process.env)

  await spawn('node', ['test-app.js'], { env })

  t.end()
})

process.on('unhandledRejection', (err, p) => {
  throw err
})
