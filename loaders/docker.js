const requireHacker = require('require-hacker')
const _ = require('lodash')

const { serviceName } = require('../util')

const LOADER_NAME = 'DOCKER'
const LOADER_PREFIX = 'docker://'

let requiredImages = []

function clear () {
  requiredImages = []
}

function register (specLock, packageData) {
  return requireHacker.global_hook(LOADER_NAME, path => {
    let deps = _.get(packageData, 'kubescript.dependencies', {})
    if (!deps[path] && !path.startsWith(LOADER_PREFIX)) {
      return
    }

    // skip if it's defined in dependencies or devDependencies
    if (packageData.dependencies[path] || packageData.devDependencies[path]) {
      return
    }

    let spec = specLock[serviceName(path)] ? specLock[serviceName(path)] : deps[path]

    if (path.startsWith('docker://')) {
      path = path.replace('docker://', '')
    }

    if (!deps[path]) {
      throw new Error(`Cannot find image '${path}'`)
    }

    if (!requiredImages.find(i => i.image === path)) {
      requiredImages.push({ serviceName: serviceName(path), image: path, spec: deps[path] })
    }
    let src = `
      module.exports = {
        host: '${serviceName(path)}',
        port: 80,
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

module.exports = { register, registerList, clear }
