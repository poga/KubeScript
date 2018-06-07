const KubeScript = require('.')

let app = new KubeScript()

app.get('/foo', function fooHandler (ctx) {
  console.log(ctx)
  ctx.body = JSON.stringify({ body: 'bar', headers: { 'Compute-type': 'Function' }, statusCode: 200 })
})

app.run()
