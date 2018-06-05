const requireHacker = require('require-hacker')
const path = require('path')
const _ = require('lodash')

let requiredImages = []

function register (packageData) {
  return requireHacker.global_hook('containerImages', path => {
    let deps = _.get(packageData, 'kubescript.dependencies', {})
    if (!deps[path] && !path.startsWith('docker://')) {
      return
    }

    if (path.startsWith('docker://')) {
      path = path.replace('docker://', '')
    }

    requiredImages.push({ serviceName: serviceName(path), image: path, spec: deps[path] })
    let src = `
      module.exports = {
        serviceName: '${serviceName(path)}',
        image: '${path}',
        spec: ${JSON.stringify(deps[path])}
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
