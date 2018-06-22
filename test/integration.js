const tape = require('tape')
const fs = require('fs')
const path = require('path')
const { spawn, getEventgatewayIP } = require('../util')
const request = require('request-promise')

try {
  fs.mkdirSync(path.join(__dirname, 'temp'))
} catch (e) {
  // ignore
}

tape('integration test', async function (t) {
  let env = Object.assign({ 'KUBESCRIPT_PHASE': 'build' }, process.env)

  await spawn('node', ['test-app.js'], { env })

  await sleep(1000)
  let eventGatewayIP = await getEventgatewayIP()

  // test GET /foo
  let resp = await request.get(`http://${eventGatewayIP}:4000/foo`)
  t.same(resp, 'bar')
  // test GET /redis
  let resp2 = await request.get(`http://${eventGatewayIP}:4000/redis`)
  t.same(resp2, '4.0.9')
  // test emit event
  await request({
    method: 'POST',
    url: `http://${eventGatewayIP}:4000`,
    headers: {
      event: 'event1'
    }
  })
  await sleep(1000)
  // test events are triggered
  let resp3 = await request.get(`http://${eventGatewayIP}:4000/triggered`)
  t.same(resp3, '{"event1Triggered":true,"event2Triggered":true}')

  t.end()
})

process.on('unhandledRejection', (err, p) => {
  throw err
})

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
