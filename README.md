# Kubescript

Kubescript is a web-app framework that helps you build scalable web application on kubernetes.

`npm i kubescript`

![preview](./assets/cli.png)

## Synopsis

```javascript
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

## Setup

To start, you need the following tools installed on your computer:

* docker
* kubectl: only tested with 1.9.7
* [conduit](https://conduit.io/)

You also need a working kubernetes cluster.

**note**: When using GKE, you need to create a role first:

`kubectl create clusterrolebinding cluster-admin-binding-$USER --clusterrole=cluster-admin --user=$(gcloud config get-value account)`.

