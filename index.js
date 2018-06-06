var app
if (process.env['KUBESCRIPT_PHASE'] === 'build') {
  app = require('./builder')
} else {
  app = require('./runner')
}

module.exports = app
