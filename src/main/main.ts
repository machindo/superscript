import * as remote from '@electron/remote/main'
import { app, BrowserWindow, Event, ipcMain } from 'electron'
import isDev from 'electron-is-dev'
import console from 'electron-log'
import { checkForUpdates } from 'main/updater'
import path from 'path'
import robot from 'robotjs'
// @ts-ignore
import SystemFonts from 'system-font-families'

import { Commands } from './commands'
import { buildMenu } from './menu'
import { createWindow } from './window'
import { createExportWindow, ExportWindowOptions } from './createExportWindow'

remote.initialize()

// Configure logger
console.transports.file.level = isDev ? 'verbose' : 'warn'
console.transports.console.level = isDev ? 'verbose' : false

const protocolName = 'superscript'
const gotTheLock = app.requestSingleInstanceLock()

let fileToOpenWhenReady: string

if (gotTheLock) {
  app.on('second-instance', async (_event, argv) => {
    // Someone tried to run a second instance, we should focus our window and open the file the user clicked on.
    let win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]

    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }

    if (path.extname(argv[1]) === '.sup') {
      const openFilePath = argv[1]
      win = await Commands.openFilename(openFilePath)
    } else {
      win = await Commands.newDocument()
    }
  })
} else {
  app.quit()
}

if (process.platform === 'darwin') {
  let doQuit = false

  app.on('before-quit', () => {
    doQuit = true
  })

  app.on('window-all-closed', () => {
    if (doQuit) {
      app.quit()
    }
  })
}

async function load() {
  // On Windows, open file when opening via superscript file
  if (
    !isDev &&
    process.platform !== 'darwin' &&
    process.argv.length >= 2
  ) {
    if (path.extname(process.argv[1]) === '.sup') {
      const openFilePath = process.argv[1]
      Commands.openFilename(openFilePath)
    } else {
      const win = await Commands.newDocument()
    }
  } else if (process.platform === 'darwin' && fileToOpenWhenReady) {
    Commands.openFilename(fileToOpenWhenReady)
  } else {
    Commands.newWindow()
  }

  checkForUpdates()
}

app.on('ready', async () => {
  buildMenu()
  load()
  app.setAsDefaultProtocolClient(protocolName)
})

// On macOS, open file when opening via superscript file
app.on('open-file', (_event, path) => {
  if (app.isReady()) {
    Commands.openFilename(path)
  } else {
    fileToOpenWhenReady = path
  }
})

// When focusing the app on Mac, create a lobby window if no windows are shown
app.on('activate', (_event, hasVisibleWindows: boolean) => {
  if (process.platform === 'darwin' && !hasVisibleWindows) {
    createWindow('{lobby}')
  }
})

ipcMain.on('updateRecentFiles', buildMenu)

// Send Cmd+V/Ctrl+V key
ipcMain.handle('tapPasteKeys', () => {
  robot.keyTap('v', process.platform === 'darwin' ? 'command' : 'control')
})

const systemFonts = new SystemFonts()

ipcMain.handle('listFonts', () => {
  return systemFonts.getFonts()
})

ipcMain.handle('createExportWindow', async (_event, options: ExportWindowOptions) => {
  const win = await createExportWindow(options)

  return win.id
})