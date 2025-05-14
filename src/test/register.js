const browserEnv = require('browser-env')
const fs = require('fs')
const join = require('path').join
const requireHacker = require('require-hacker')
const tsNodeRegister = require('ts-node').register
const tsConfigRegister = require('tsconfig-paths').register

const tsconfig = require('../../tsconfig.json')

tsNodeRegister()

requireHacker.hook('css', () => `module.exports = ''`)
requireHacker.hook('styl', () => `module.exports = ''`)
requireHacker.hook('html', () => `module.exports = function () {}`)

requireHacker.global_hook('electron-stub', path => {
  switch (path) {
    case 'electron':
      return {
        path,
        source: fs.readFileSync(join(__dirname, 'electron-stub.js'), {
          encoding: 'utf8'
        })
      }
    case 'pdfjs-dist/build/pdf.worker.js':
      return {
        path,
        source: fs.readFileSync(join(__dirname, 'pdf-worker-stub.js'), {
          encoding: 'utf8'
        })
      }
    case 'vue':
      return {
        path,
        source: fs.readFileSync(
          join(__dirname, '../../node_modules/vue/dist/vue.common.js'),
          {
            encoding: 'utf8'
          }
        )
      }
  }
})
tsConfigRegister({
  baseUrl: tsconfig.compilerOptions.baseUrl,
  paths: {
    src: tsconfig.include
  }
})

browserEnv(['window', 'document', 'navigator', 'Node', 'Element'])
