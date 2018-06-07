const tape = require('tape')
const fs = require('fs')
const path = require('path')
const { exec, spawn } = require('../exec')

try {
  fs.mkdirSync(path.join(__dirname, 'temp'))
} catch (e) {
  // ignore
}

tape('integration test', async function (t) {
  let env = Object.assign({ 'KUBESCRIPT_PHASE': 'build' }, process.env)

  await spawn('node', ['testApp.js'], { env })

  t.end()
})
