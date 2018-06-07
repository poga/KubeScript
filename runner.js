const Koa = require('koa')
const Router = require('koa-router')
const logger = require('koa-logger')
const cors = require('@koa/cors')
const request = require('request-promise')

const { assertNotAnonymous } = require('./assert')

const DEFAULT_EVENT_GATEWAY_HOST = 'event-gateway'

function Runner (eventGatewayHost) {
  if (!eventGatewayHost) eventGatewayHost = DEFAULT_EVENT_GATEWAY_HOST

  this.EG = eventGatewayHost
  this.router = new Router()
}

Runner.prototype.on = function (event, handler) {
  assertNotAnonymous(handler.name)

  this.router.post(`/${handler.name}`, handler)
}

Runner.prototype.get = function (path, handler) {
  assertNotAnonymous(handler.name)

  this.router.post(`/GET-${handler.name}`, handler)
}

Runner.prototype.post = function (path, handler) {
  assertNotAnonymous(handler.name)

  this.router.post(`/POST-${handler.name}`, handler)
}

Runner.prototype.put = function (path, handler) {
  assertNotAnonymous(handler.name)

  this.router.post(`/PUT-${handler.name}`, handler)
}

Runner.prototype.delete = function (path, handler) {
  assertNotAnonymous(handler.name)

  this.router.post(`/DELETE-${handler.name}`, handler)
}

Runner.prototype.emit = async function (event, payload) {
  await request({
    method: 'POST',
    uri: `http://${this.EG}:4000/`,
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
    .use(cors())
    .use(logger())
    .use(async (ctx, next) => {
      await next()
      let body = ctx.body
      let headers = ctx.response.headers
      let statusCode = ctx.status
      console.log('middleware', body, headers, statusCode)
      ctx.body = JSON.stringify({ body, headers, statusCode })
      ctx.status = 200
    })
    .use(this.router.routes())
    .use(this.router.allowedMethods())

  return app.listen(3000)
}

module.exports = Runner
