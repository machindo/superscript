import { enable as enableRemote } from '@electron/remote/main'
import { app, BrowserWindow, webContents } from 'electron'
import path from 'path'
import { Settings } from 'shared/settings'

import { disableMenu } from './menu'
import { touchBar } from './touchbar'

interface UiSettings {
  autoHideMenuBar: boolean
  colorTheme: 'light-theme' | 'dark-theme'
}

interface WindowState {
  maximized: boolean
  position: number[] | null
  size: number[]
}

async function saveWindowState(win: BrowserWindow) {
  Settings.set('lastWindowState', {
    maximized: win.isMaximized(),
    position: win.getPosition(),
    size: win.getSize()
  })
}

let windowCount = 0

async function newWindow(): Promise<BrowserWindow> {
  const uiSettings = await Settings.get<UiSettings>('ui')
  windowCount++

  const win: BrowserWindow = new BrowserWindow({
    title: 'Superscript',
    minWidth: 800,
    minHeight: 500,
    webPreferences: { contextIsolation: false, nodeIntegration: true, webviewTag: true },
    backgroundColor: uiSettings.colorTheme === 'dark-theme' ? '#202020' : '#eee',
    show: false,
    autoHideMenuBar: uiSettings.autoHideMenuBar,
    titleBarStyle: 'hiddenInset'
  })

  enableRemote(win.webContents)

  win.setTouchBar(touchBar)

  // On Mac, use the limitted app menu when no windows are visible
  if (process.platform === 'darwin') {
    win.on('closed', () => {
      if (!BrowserWindow.getFocusedWindow()) {
        disableMenu()
      }
    })
  } else {
    win.on('closed', () => {
      windowCount--
      if (windowCount === 0) {
        app.quit()
      }
    })
  }

  win.on('focus', () => {
    saveWindowState(win)
  })

  win.webContents.on('did-attach-webview', () => {
    webContents.getAllWebContents().forEach(enableRemote)
  })

  return win
}

function onReady(win: BrowserWindow, filename: string, maximize?: boolean) {
  switch (filename) {
    case '{lobby}':
      win.webContents.send('createTab', 'showLobby')
      break
    case '{new-doc}':
      win.webContents.send('createTab', 'openNew')
      break
    case '{preferences}':
      win.webContents.send('createTab', 'preferences')
      break
    default:
      win.webContents.send('createTab', 'openFile', filename)
      win.setRepresentedFilename(filename)
  }

  if (maximize) {
    win.maximize()
  }

  // Prevent page navigation (e.g. when user drags an image file to the window)
  win.webContents.on('will-navigate', event => event.preventDefault())
}

export async function createWindow(filename: string, openInNewWindow = false): Promise<BrowserWindow> {
  const win = await newWindow()
  let lastWindowState: WindowState | undefined

  if (process.platform !== 'darwin' || openInNewWindow || !BrowserWindow.getFocusedWindow()) {
    lastWindowState = await Settings.get<WindowState>('lastWindowState', {
      maximized: false,
      position: null,
      size: [800, 600]
    })

    // Offset new windows
    if (BrowserWindow.getAllWindows().length > 1 && lastWindowState.position) {
      lastWindowState.position[0] += 20
      lastWindowState.position[1] += 20
    }

    win.setSize(lastWindowState.size[0], lastWindowState.size[1])

    if (lastWindowState.position) {
      win.setPosition(lastWindowState.position[0], lastWindowState.position[1])
    }

    saveWindowState(win)

    if (process.platform === 'darwin') {
      win.once('show', () => win.moveTabToNewWindow())
    }
  }

  win.on('move', () => saveWindowState(win))
  win.on('resize', () => saveWindowState(win))

  await win.loadFile(path.join(__dirname, 'parent.html'))
  onReady(win, filename, lastWindowState && lastWindowState.maximized)
  win.show()

  return win
}
