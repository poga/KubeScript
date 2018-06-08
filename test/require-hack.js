const tape = require('tape')
const reqhack = require('../require-hack')

tape('require hack should ignore valid require', function (t) {
  let hook = reqhack.register(makePackageData())

  t.doesNotThrow(() => {
    require('fs')
  })

  hook.unmount()
  t.end()
})

tape('require hack should prioritize npm module', function (t) {
  let hook = reqhack.register(makePackageData())

  let m = require('tape')
  t.notOk(m.spec)

  hook.unmount()
  t.end()
})

tape('require hack can be forced to require docker image with docker://', function (t) {
  let hook = reqhack.register(makePackageData())

  let m = require('docker://tape')
  t.notOk(m.spec)

  hook.unmount()
  t.end()
})

tape('force hijack require with docker://', function (t) {
  let hook = reqhack.register(makePackageData())

  t.doesNotThrow(() => {
    require('docker://foobar')
  })

  hook.unmount()
  t.end()
})

tape('can\'t find module', function (t) {
  let hook = reqhack.register(makePackageData())

  t.throws(() => {
    require('foobar2')
  })

  hook.unmount()
  t.end()
})

tape('unknown docker image', function (t) {
  let hook = reqhack.register(makePackageData())

  t.throws(() => {
    require('docker://foobar2')
  })

  hook.unmount()
  t.end()
})

tape('inject hook', function (t) {
  let hook = reqhack.register(makePackageData())

  let foobar = require('foobar')
  t.same(foobar, { serviceName: 'foobar', image: 'foobar', spec: { spec: 1234 } })

  hook.unmount()
  t.end()
})

tape('service name', function (t) {
  let hook = reqhack.register(makePackageData())

  let foobar = require('gcr.io/kubescript-test/kubescript-app')
  t.same(foobar, {
    serviceName: 'kubescript-app',
    image: 'gcr.io/kubescript-test/kubescript-app',
    spec: { spec: 'blah' }
  })

  hook.unmount()
  t.end()
})

tape('unmount', function (t) {
  let hook = reqhack.register(makePackageData())
  hook.unmount()

  t.throws(() => {
    require('gcr.io/kubescript-test/kubescript-app')
  })
  t.end()
})

function makePackageData () {
  return {
    dependencies: {
      'tape': '^4.9.0'
    },
    kubescript: {
      dependencies: {
        foobar: { spec: 1234 },
        'gcr.io/kubescript-test/kubescript-app': { spec: 'blah' },
        tape: { spec: 'test' }
      }
    }
  }
}
