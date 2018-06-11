# Kubescript

Kubescript is a web-app framework that helps you build scalable web application.

It compiles your app to a scalable cluster run on kubernetes with built-in best-practices, all with plain javascript.

`npm i kubescript`

## Quickstart

```javascript
// index.js
const App = require('kubescript')
// require docker images directly
const redisConfig = require('docker://redis')
const redisClient = require('redis')

let app = new App()

// http endpoint
app.get('/hello', function (ctx) {
  ctx.body = 'world'
})

app.post('/foo', function (ctx) {
  // connect to services created with the docker image
  let c = redisClient.createClient({
    host: redisConfig.host,
    port: redisConfig.port
  })

  ctx.body = 'bar'
})

// event emitting and handling
app.on('user.registered', function (ctx) {
  app.emit('send_welcome_email')
})

app.on('send_welcome_email', function (ctx) {
  // send email
})

app.run()
```

Build the app:

```
$ node index.js
```

## Setup

To build app with kubescript, you need the following tools installed:

* kubectl and a kubernetes cluster
* [conduit](https://conduit.io/)