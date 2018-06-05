const tape = require('tape')
const Builder = require('../builder')

tape('require hack side effect', function (t) {
  require('foobar')
  let app = new Builder()
  app.run()

  t.end()
})

tape('dry run', function (t) {
  let app = new Builder()
  app.run('./testOut', { dryRun: true })

  t.end()
})

tape.only('get exposed ports', function (t) {
  let app = new Builder()
  require('docker://redis')
  // app.run('./testOut', { dryRun: true })
  app.on('foobar2', function foobarHandler () { })
  app.get('/run', function run () { })
  app.run('./testOut')

  t.end()
})

tape('conduit inject required images', function (t) {
  t.end()
})

tape('conduit inject required images', function (t) {
  let app = new Builder()
  require('foobar')
  app.run('./testOut', { dryRun: true })

  t.end()
})
