const request = require('request-promise')
const { assertNotAnonymous } = require('./assert')

function Events () {
  this.subscriptions = {}
  this.functions = {}
}

Events.prototype.register = function (reg) {
  let { event, method, path, handler } = reg
  let name = handler.name

  assertNotAnonymous(name)

  reg.handlerName = name
  reg.name = reg.method ? `${reg.method}-${reg.handlerName}` : reg.handlerName

  this.functions[reg.name] = reg

  let key = Events.getKey(event, method, path, name)
  this.subscriptions[key] = reg
}

Events.prototype.apply = async function (eventGatewayIP) {
  let functionsToRemove = await this._applyFunctions(eventGatewayIP)

  await this._applySubscriptions(eventGatewayIP)

  // remove functions after their subscriptions are removed
  for (let name of functionsToRemove) {
    console.log('removing', name)
    await request({
      method: 'DELETE',
      uri: `http://${eventGatewayIP}:4001/v1/spaces/default/functions/${name}`
    })
  }
}

Events.prototype._applyFunctions = async function (eventGatewayIP) {
  console.log('applying function')
  // get functions
  let resp = await request({
    method: 'GET',
    uri: `http://${eventGatewayIP}:4001/v1/spaces/default/functions`
  })
  let functions = JSON.parse(resp).functions
  let functionsToRemove = []
  console.log('functions', functions)
  let existedFunctions = {}
  for (let func of functions) {
    let name = func.functionId
    existedFunctions[name] = true
    if (!this.functions[name]) {
      console.log('remove function', name)
      functionsToRemove.push(name)
    }
  }

  for (let name of Object.keys(this.functions)) {
    let reg = this.functions[name]
    if (!existedFunctions[name]) {
      console.log('add function', reg)
      await request({
        method: 'POST',
        uri: `http://${eventGatewayIP}:4001/v1/spaces/default/functions`,
        body: {
          functionId: reg.name,
          type: 'http',
          provider: { url: `http://app/${reg.name}` }
        },
        json: true
      })
    }
  }

  return functionsToRemove
}

Events.prototype._applySubscriptions = async function (eventGatewayIP) {
  console.log('applying subscription')
  let resp = await request({
    method: 'GET',
    uri: `http://${eventGatewayIP}:4001/v1/spaces/default/subscriptions`
  })
  let subscriptions = JSON.parse(resp).subscriptions
  console.log(subscriptions)
  let existedSubscriptions = {}
  // remove old subscriptions
  for (let sub of subscriptions) {
    let key = Events.getKey(sub.event, sub.method, sub.path, sub.functionID)
    existedSubscriptions[key] = true

    if (!this.subscriptions[key]) {
      console.log('remove', key)
      await request({
        method: 'DELETE',
        uri: `http://${eventGatewayIP}:4001/v1/spaces/default/subscriptions/${sub.subscriptionId}`
      })
    }
  }

  // add new subscriptions
  for (let key of Object.keys(this.subscriptions)) {
    let sub = this.subscriptions[key]
    if (!existedSubscriptions[key]) {
      console.log('add', this.subscriptions[key])
      await request({
        method: 'POST',
        uri: `http://${eventGatewayIP}:4001/v1/spaces/default/subscriptions`,
        body: {
          functionId: sub.name,
          event: sub.event,
          method: sub.method,
          path: sub.path
        },
        json: true
      })
    }
  }
}

Events.getKey = function (event, method, path, handlerName) {
  let key = [event, method, path, handlerName].join(',')
  return key
}

module.exports = Events
