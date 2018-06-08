const request = require('request-promise')
const { functionId, eventFunctionId } = require('./util')

function Events () {
  this.subscriptions = {}
  this.functions = {}
}

Events.prototype.register = function (reg) {
  let { event, method, path } = reg

  if (event === 'http') {
    reg.internalPath = `/${functionId(method, path)}`
    reg.functionId = functionId(method, path)
  } else {
    reg.functionId = eventFunctionId(event)
  }

  this.functions[reg.functionId] = reg
  this.subscriptions[getSubscriptionKey(event, method, path, functionId)] = reg
}

Events.prototype.apply = async function (eventGatewayIP) {
  let functionsToRemove = await this._applyFunctions(eventGatewayIP)

  await this._applySubscriptions(eventGatewayIP)

  // remove functions after their subscriptions are removed
  await this._removeFunctions(eventGatewayIP, functionsToRemove)
}

Events.prototype._removeFunctions = async function (eventGatewayIP, functionsToRemove) {
  for (let functionId of functionsToRemove) {
    console.log('removing', functionId)
    await request({
      method: 'DELETE',
      uri: `http://${eventGatewayIP}:4001/v1/spaces/default/functions/${functionId}`
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
    existedFunctions[func.functionId] = true
    if (!this.functions[func.functionId]) {
      console.log('remove function', func.functionId)
      functionsToRemove.push(func.functionId)
    }
  }

  for (let functionId of Object.keys(this.functions)) {
    let reg = this.functions[functionId]
    if (!existedFunctions[functionId]) {
      console.log('add function', reg)
      await request({
        method: 'POST',
        uri: `http://${eventGatewayIP}:4001/v1/spaces/default/functions`,
        body: {
          functionId: reg.functionId,
          type: 'http',
          provider: { url: `http://app${reg.internalPath}` }
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
    let subKey = getSubscriptionKey(sub.event, sub.method, sub.path, sub.functionId)
    existedSubscriptions[subKey] = true

    if (!this.subscriptions[subKey]) {
      console.log('removing subscription', subKey)
      await request({
        method: 'DELETE',
        uri: `http://${eventGatewayIP}:4001/v1/spaces/default/subscriptions/${sub.subscriptionId}`
      })
    }
  }

  // add new subscriptions
  for (let subKey of Object.keys(this.subscriptions)) {
    let sub = this.subscriptions[subKey]
    if (!existedSubscriptions[subKey]) {
      console.log('adding subscription', this.subscriptions[subKey])
      await request({
        method: 'POST',
        uri: `http://${eventGatewayIP}:4001/v1/spaces/default/subscriptions`,
        body: {
          functionId: sub.functionId,
          event: sub.event,
          method: sub.method,
          path: sub.path
        },
        json: true
      })
    }
  }
}

module.exports = Events

function getSubscriptionKey (event, method, path, functionId) {
  return [event, method, path, functionId].join(',')
}
