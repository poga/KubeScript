const requireHacker = require('require-hacker')
const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const { spawn, exec, serviceName } = require('../util')

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

async function build (out) {
  var specLock = {}
  for (let req of requiredImages) {
    let base = yaml.safeLoad(fs.readFileSync(path.join(__dirname, '..', 'yaml', 'base.yaml')))
    base.metadata.name = req.serviceName
    base.metadata.labels.app = 'service'
    base.spec.template.metadata.labels.app = req.serviceName
    base.spec.template.metadata.labels.tier = 'dependency'

    let version = req.spec.version ? `:${req.spec.version}` : ''
    let image = `${req.image}${version}`
    base.spec.template.spec.containers[0].image = image
    base.spec.template.spec.containers[0].name = req.serviceName
    if (req.spec.ports) {
      base.spec.template.spec.containers[0].ports = req.spec.ports
    } else {
      await spawn('docker', ['pull', image])
      let exposedPorts = await exec(`docker inspect --format="{{json .Config.ExposedPorts }}" ${req.image}`)
      exposedPorts = JSON.parse(exposedPorts.stdout)
      console.log(exposedPorts)

      let specPorts = []
      for (let port of Object.keys(exposedPorts)) {
        let p = +port.replace('/tcp', '')
        specPorts.push({ name: port.replace('/', '-'), containerPort: p })
      }
      base.spec.template.spec.containers[0].ports = specPorts
    }

    specLock[req.serviceName] = base.spec.template.spec
    specLock[req.serviceName].ports = base.spec.template.spec.containers[0].ports

    fs.writeFileSync(path.join(out, `${req.serviceName}.yaml`), yaml.safeDump(base))

    await spawn('sh', ['-c', `conduit inject ${path.join(out, `${req.serviceName}.yaml`)} > ${path.join(out, `${req.serviceName}.injected.yaml`)}`])

    let baseService = yaml.safeLoad(fs.readFileSync(path.join(__dirname, '..', 'yaml', 'base.service.yaml')))
    baseService.spec.selector.app = req.serviceName
    baseService.metadata.name = req.serviceName
    baseService.spec.selector.tier = 'dependency'
    baseService.spec.selector.app = req.serviceName
    baseService.spec.ports[0].targetPort = base.spec.template.spec.containers[0].ports[0].containerPort
    fs.writeFileSync(path.join(out, `${req.serviceName}.service.yaml`), yaml.safeDump(baseService))

    await spawn('sh', ['-c', `conduit inject ${path.join(out, `${req.serviceName}.service.yaml`)} > ${path.join(out, `${req.serviceName}.service.injected.yaml`)}`])
  }

  fs.writeFileSync(path.join(process.cwd(), 'kubescript-lock.json'), JSON.stringify(specLock, null, 4))
  return specLock
}

async function apply (out) {
  for (let req of requiredImages) {
    await spawn('kubectl', ['apply', '-f', path.join(out, `${req.serviceName}.injected.yaml`)])
    await spawn('kubectl', ['rollout', 'status', `deploy/${req.serviceName}`])
    await spawn('kubectl', ['apply', '-f', path.join(out, `${req.serviceName}.service.yaml`)])
  }
}

module.exports = { register, registerList, clear, build, apply }
