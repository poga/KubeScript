const KubeScript = require('.')
const redis = require('redis')
const path = require('path')
const redisConfig = require('docker://redis')

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

app.get('/redis', async function (ctx) {
  console.log(redis)
  let c = redis.createClient({ host: redisConfig.host, port: redisConfig.port })
  await wait(c, 'ready')

  console.log(c.server_info.redis_version)
  ctx.body = c.server_info.redis_version
})

app.get('/foo', function (ctx) {
  console.log(ctx)
  ctx.body = 'bar'
})

app.run('./out', { dockerfilePath: path.join(__dirname, 'test', 'Dockerfile') })

function wait (emitter, event) {
  return new Promise((resolve, reject) => {
    emitter.on(event, (x) => { resolve(x) })
  })
}
