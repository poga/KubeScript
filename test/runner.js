const tape = require('tape')
const Runner = require('../runner')
const request = require('request-promise')

tape('http', async function (t) {
  const app = new Runner()

  app.get('/foo', async function fooHandler (ctx) {
    ctx.body = 'bar'
  })

  let srv = app.run()
  let ret = await request.get('http://localhost:3000/foo')
  t.same(ret, 'bar')
  srv.close()
  t.end()
})

tape('event', async function (t) {
  const app = new Runner()

  app.on('foo', async function fooHandler (ctx) {
    ctx.body = 'bar'
  })

  let srv = app.run()
  let ret = await request.post('http://localhost:3000/fooHandler')
  t.same(ret, 'bar')
  srv.close()
  t.end()
})
