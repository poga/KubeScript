const requireHacker = require('require-hacker')
const path = require('path')
const _ = require('lodash')
const fs = require('fs')

let requiredImages = []

var specLock = {}
if (process.env['KUBESCRIPT_PHASE'] !== 'build') {
  specLock = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'kubescript-lock.json')))
}

function clear () {
  requiredImages = []
}

function register (packageData) {
  return requireHacker.global_hook('containerImages', path => {
    let deps = _.get(packageData, 'kubescript.dependencies', {})
    if (!deps[path] && !path.startsWith('docker://')) {
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

function serviceName (imagePath) {
  return path.basename(imagePath.split(':')[0])
}

module.exports = { register, registerList, clear }
