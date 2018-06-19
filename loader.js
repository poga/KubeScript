const path = require('path')
const fs = require('fs')

let loaders = []

const dockerLoader = require('./loaders/docker')
loaders.push(dockerLoader)

var specLock = {}
if (process.env['KUBESCRIPT_PHASE'] !== 'build') {
  specLock = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'kubescript-lock.json')))
}

function clear () {
  for (let l of loaders) {
    l.clear()
  }
}

function register (packageData) {
  for (let l of loaders) {
    l.register(specLock, packageData)
  }
}

function registerList () {
  let registered = []
  for (let l of loaders) {
    registered = registered.concat(l.registerList())
  }

  return registered
}

async function build (out) {
  for (let l of loaders) {
    await l.build(out)
  }
}

async function apply (out) {
  for (let l of loaders) {
    await l.apply(out)
  }
}

module.exports = { register, registerList, clear, build, apply }
