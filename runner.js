const Koa = require('koa')
const Router = require('koa-router')
const request = require('request-promise')

const EVENT_GATEWAY_HOST = 'event-gateway'

function Runner () {
  this.router = new Router()
}

Runner.prototype.on = function (event, handler) {
  if (handler.name === 'anonymous') {
    throw new Error('Anonymous function is not allowed. Please specify a name')
  }

  this.router.post(`/${handler.name}`, handler)
}

Runner.prototype.get = function (path, handler) {
  if (handler.name === 'anonymous') {
    throw new Error('Anonymous function is not allowed. Please specify a name')
  }

  this.router.get(path, handler)
}

Runner.prototype.post = function (path, handler) {
  if (handler.name === 'anonymous') {
    throw new Error('Anonymous function is not allowed. Please specify a name')
  }

  this.router.post(path, handler)
}

Runner.prototype.put = function (path, handler) {
  if (handler.name === 'anonymous') {
    throw new Error('Anonymous function is not allowed. Please specify a name')
  }

  this.router.put(path, handler)
}

Runner.prototype.delete = function (path, handler) {
  if (handler.name === 'anonymous') {
    throw new Error('Anonymous function is not allowed. Please specify a name')
  }

  this.router.delete(path, handler)
}

Runner.prototype.emit = async function (event, payload) {
  await request({
    method: 'POST',
    uri: `http://${EVENT_GATEWAY_HOST}:4000/`,
    headers: {
      Event: event
    },
    body: payload,
    json: true
  })
}

Runner.prototype.run = function () {
  let app = new Koa()
  this.app = app

  app
    .use(this.router.route())
    .use(this.router.allowedMethods())

  app.listen(3000)
}

module.exports = Runner
