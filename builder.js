const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')
const util = require('util')
let mkdirp = require('mkdirp')
mkdirp = util.promisify(mkdirp)

// setup require hook
const loader = require('./loader')
const packageData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json')))
loader.register(packageData)

const Events = require('./events')
const { spawn, exec, getEventgatewayIP } = require('./util')

function Builder () {
  this.events = new Events()
  this.subscriptions = {}

  this.functions = {}
}

Builder.prototype.on = function (event, handler) {
  this._subscribe({ event, handler })
}

Builder.prototype.get = function (path, handler) {
  this._subscribe({ event: 'http', method: 'GET', path, handler })
}

Builder.prototype.post = function (path, handler) {
  this._subscribe({ event: 'http', method: 'POST', path, handler })
}

Builder.prototype.put = function (path, handler) {
  this._subscribe({ event: 'http', method: 'PUT', path, handler })
}

Builder.prototype.delete = function (path, handler) {
  this._subscribe({ event: 'http', method: 'DELETE', path, handler })
}

Builder.prototype._subscribe = function ({ event, method, path, handler }) {
  this.events.register({ event, method, path, handler })
}

Builder.prototype.emit = function () {
  // no-op and compile-time

  throw new Error('emit is a no-op at compile-time')
}

Builder.prototype.run = async function (outPrefix, opts) {
  if (!outPrefix) outPrefix = './out'
  if (!opts) opts = {}

  let out = path.resolve(outPrefix)

  await mkdirp(out)

  // 1. generate yamls

  // basic infrastructure
  fs.copyFileSync(path.join(__dirname, 'yaml', 'conduit.yaml'), path.join(out, 'conduit.yaml'))
  fs.copyFileSync(path.join(__dirname, 'yaml', 'etcd.yaml'), path.join(out, 'etcd.yaml'))
  fs.copyFileSync(path.join(__dirname, 'yaml', 'event-gateway.yaml'), path.join(out, 'event-gateway.yaml'))

  var dockerfile
  if (opts.dockerfilePath) {
    dockerfile = fs.readFileSync(opts.dockerfilePath).toString()
  } else {
    dockerfile = fs.readFileSync(__dirname, 'yaml', 'Dockerfile').toString()
  }

  // update Dockerfile to use the specified entry point
  let mainFile = path.basename(process.argv[1])
  console.log('mainFile', mainFile)
  dockerfile = dockerfile.replace('CMD npm start', `CMD node ${mainFile}`)
  fs.writeFileSync(path.join(process.cwd(), 'Dockerfile'), dockerfile)

  // app pod
  let imagePrefix = packageData.kubescript.prefix || ''
  const appImageTag = `${imagePrefix}${packageData.name}:${packageData.version}`

  // setup app deployment
  let appd = yaml.safeLoad(fs.readFileSync(path.join(__dirname, 'yaml', 'base.yaml')))
  appd.metadata.name = packageData.name
  appd.spec.selector = { matchLabels: { app: packageData.name } }
  appd.spec.template.metadata.labels.app = packageData.name
  appd.spec.template.metadata.annotations = { builtAt: `${new Date()}`, builtWith: 'kubescript' }
  appd.spec.template.spec.containers[0].image = appImageTag
  appd.spec.template.spec.containers[0].name = packageData.name
  appd.spec.template.spec.containers[0].readinessProbe = {
    httpGet: {
      path: '/readinessProbe',
      port: 3000
    },
    initialDelaySeconds: 1,
    timeoutSeconds: 1,
    periodSeconds: 15
  }
  fs.writeFileSync(path.join(out, 'app.yaml'), yaml.safeDump(appd))

  // setup app service
  let apps = yaml.safeLoad(fs.readFileSync(path.join(__dirname, 'yaml', 'base.service.yaml')))
  apps.spec.selector.app = packageData.name
  fs.writeFileSync(path.join(out, 'app.service.yaml'), yaml.safeDump(apps))

  // dependent pods
  let requiredImages = loader.registerList()
  let specLock = {}
  for (let req of requiredImages) {
    let base = yaml.safeLoad(fs.readFileSync(path.join(__dirname, 'yaml', 'base.yaml')))
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

    let baseService = yaml.safeLoad(fs.readFileSync(path.join(__dirname, 'yaml', 'base.service.yaml')))
    baseService.spec.selector.app = req.serviceName
    baseService.metadata.name = req.serviceName
    baseService.spec.selector.tier = 'dependency'
    baseService.spec.selector.app = req.serviceName
    baseService.spec.ports[0].targetPort = base.spec.template.spec.containers[0].ports[0].containerPort
    fs.writeFileSync(path.join(out, `${req.serviceName}.service.yaml`), yaml.safeDump(baseService))

    await spawn('sh', ['-c', `conduit inject ${path.join(out, `${req.serviceName}.service.yaml`)} > ${path.join(out, `${req.serviceName}.service.injected.yaml`)}`])
  }
  fs.writeFileSync(path.join(process.cwd(), 'kubescript-lock.json'), JSON.stringify(specLock, null, 4))

  if (opts.dryRun) return

  // 2. build image
  await spawn('docker', ['build', '-t', appImageTag, '.'])

  // push to repo
  await spawn('docker', ['push', appImageTag])

  // 3. apply to k8s
  // setup conduit
  await spawn('kubectl', ['apply', '-f', path.join(out, 'conduit.yaml')])
  await spawn('kubectl', ['rollout', 'status', 'deploy/controller', '--namespace=conduit'])

  // setup event-gateway
  await spawn('kubectl', ['apply', '-f', path.join(out, 'etcd.yaml')])
  await spawn('kubectl', ['apply', '-f', path.join(out, 'event-gateway.yaml')])
  await spawn('kubectl', ['rollout', 'status', 'deploy/event-gateway'])

  // // * setup required containers & service
  for (let req of requiredImages) {
    await spawn('kubectl', ['apply', '-f', path.join(out, `${req.serviceName}.injected.yaml`)])
    await spawn('kubectl', ['rollout', 'status', `deploy/${req.serviceName}`])
    await spawn('kubectl', ['apply', '-f', path.join(out, `${req.serviceName}.service.yaml`)])
  }

  // // * setup app pods & services
  // // deploy app
  await spawn('sh', ['-c', `conduit inject ${path.join(out, 'app.yaml')} > ${path.join(out, 'app.injected.yaml')}`])
  await spawn('kubectl', ['apply', '-f', path.join(out, 'app.injected.yaml')])
  await spawn('kubectl', ['rollout', 'status', `deploy/${packageData.name}`])
  await spawn('sh', ['-c', `conduit inject ${path.join(out, 'app.service.yaml')} > ${path.join(out, 'app.service.injected.yaml')}`])
  await spawn('kubectl', ['apply', '-f', path.join(out, 'app.service.injected.yaml')])

  // setup event-gateway
  // get event-gateway external IP
  let eventgatewayIP = await getEventgatewayIP()
  console.log(eventgatewayIP)

  await this.events.apply(eventgatewayIP)
}

module.exports = Builder
