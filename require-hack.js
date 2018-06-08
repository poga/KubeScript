const requireHacker = require('require-hacker')
const path = require('path')
const _ = require('lodash')
const fs = require('fs')

let requiredImages = []

var specLock = {}
if (process.env['KUBESCRIPT_PHASE'] !== 'build') {
  specLock = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'kubescript-lock.json')))
}

function register (packageData) {
  return requireHacker.global_hook('containerImages', path => {
    let deps = _.get(packageData, 'kubescript.dependencies', {})
    if (!deps[path] && !path.startsWith('docker://')) {
      return
    }

    if (packageData.dependencies[path]) {
      return
    }

    let spec = specLock[serviceName(path)] ? specLock[serviceName(path)] : deps[path]

    if (path.startsWith('docker://')) {
      path = path.replace('docker://', '')
    }

    if (!deps[path]) {
      throw new Error(`Cannot find module '${path}'`)
    }

    requiredImages.push({ serviceName: serviceName(path), image: path, spec: deps[path] })
    let src = `
      module.exports = {
        serviceName: '${serviceName(path)}',
        image: '${path}',
        spec: ${JSON.stringify(spec)}
      }
    `
    return { source: src, path }
  })
}

function registerList () {
  return requiredImages
}

function serviceName (imagePath) {
  return path.basename(imagePath.split(':')[0])
}

module.exports = { register, registerList }
