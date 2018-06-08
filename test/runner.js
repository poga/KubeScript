const tape = require('tape')
const Runner = require('../runner')
const request = require('request-promise')

tape('http', async function (t) {
  const app = new Runner()

  app.get('/foo', async function (ctx) {
    ctx.body = 'bar'
  })

  let srv = app.run()
  let ret = await request.post('http://localhost:3000/GET-foo')
  t.same(ret, '{"body":"bar","headers":{"vary":"Origin","content-type":"text/plain; charset=utf-8","content-length":"3"},"statusCode":200}')
  srv.close()
  t.end()
})

tape('event', async function (t) {
  const app = new Runner()

  app.on('foo', async function (ctx) {
    ctx.body = 'bar'
  })

  let srv = app.run()
  let ret = await request.post('http://localhost:3000/EVENT-foo')
  t.same(ret, '{"body":"bar","headers":{"vary":"Origin","content-type":"text/plain; charset=utf-8","content-length":"3"},"statusCode":200}')
  srv.close()
  t.end()
})
