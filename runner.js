const Koa = require('koa')
const Router = require('koa-router')

function Runner () {
}

Runner.prototype.on = function (event, handler) {
  if (!this.subscriptions[event]) this.subscriptions[event] = []

  if (handler.name === 'anonymous') {
    throw new Error('Anonymous function is not allowed. Please specify a name')
  }
  this.subscriptions[event].push({ event: event, functionID: handler.name })
}

Runner.prototype.get = function (path, handler) {
  if (handler.name === 'anonymous') {
    throw new Error('Anonymous function is not allowed. Please specify a name')
  }
  this.subscriptions.http.push({ method: 'GET', functionID: handler.name })
}

Runner.prototype.post = function (path, handler) {
  if (handler.name === 'anonymous') {
    throw new Error('Anonymous function is not allowed. Please specify a name')
  }
  this.subscriptions.http.push({ method: 'POST', functionID: handler.name })
}

Runner.prototype.put = function (path, handler) {
  if (handler.name === 'anonymous') {
    throw new Error('Anonymous function is not allowed. Please specify a name')
  }
  this.subscriptions.http.push({ method: 'PUT', functionID: handler.name })
}

Runner.prototype.delete = function (path, handler) {
  if (handler.name === 'anonymous') {
    throw new Error('Anonymous function is not allowed. Please specify a name')
  }
  this.subscriptions.http.push({ method: 'DELETE', functionID: handler.name })
}

Runner.prototype.emit = function () {
  // emit
}

Runner.prototype.run = function () {
  this.app = new Koa()
  // * setup http router
  // * setup event router
  // * start router
  // * get event-gateway address and save it
  // * get required container service address
}

module.exports = Runner
