const KubeScript = require('.')

let app = new KubeScript()

app.get('/foo', function fooHandler (ctx) {
  console.log(ctx)
  ctx.body = 'bar'
})

app.run()
