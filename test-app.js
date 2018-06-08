const KubeScript = require('.')
const redis = require('redis')

let app = new KubeScript()

app.on('event1', function (ctx) {
  console.log('redis', JSON.stringify(redis))
  console.log('event1', ctx, ctx.request.body)

  app.emit('event2', { a: 'b' })
  ctx.body = 'ok'
})

app.on('event2', function (ctx) {
  console.log('event2', ctx, ctx.request.body)
  ctx.body = 'ok'
})

app.get('/foo', function (ctx) {
  console.log(ctx)
  ctx.body = 'bar'
})

app.run()
