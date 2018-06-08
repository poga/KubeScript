function functionId (method, path) {
  return `${method.toUpperCase()}-${path.slice(1).replace('/')}`
}

function eventFunctionId (event) {
  return `EVENT-${event}`
}

module.exports = { functionId, eventFunctionId }
