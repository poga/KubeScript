#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
let program = require('commander')

const packageData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json')))

program
  .command('add <dep>')
  .action(function (dep, cmd) {
    var name
    var version = 'latest'
    if (dep.includes('@')) {
      [name, version] = dep.split('@')
    } else {
      name = dep
    }

    if (!packageData.KubeScript) packageData.KubeScript = {}
    if (!packageData.KubeScript.dependencies) packageData.KubeScript.dependencies = {}

    packageData.KubeScript.dependencies[name] = {version}

    fs.writeFileSync(path.join(process.cwd(), 'package.json'), JSON.stringify(packageData, null, 2))
  })

program.parse(process.argv)
