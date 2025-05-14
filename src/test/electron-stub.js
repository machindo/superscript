const app = {
  getName() {
    return ''
  },
  getPath() {
    return 'temp'
  },
  quit() { },
  relaunch() { }
}

class BrowserWindow {
  on() { }
  once() { }
  addListener() { }
  removeListener() { }
  static getAllWindows() {
    return []
  }
  static getFocusedWindow() {
    return new BrowserWindow()
  }
}

const clipboard = {
  write() { },
  writeFindText() { },
  writeHTML() { },
  writeImage() { },
  writeRTF() { },
  writeText() { }
}

const dialog = {
  showOpenDialog() { },
  showSaveDialog() { }
}

const globalShortcut = {
  register() { },
  unregister() { }
}

const ipcMain = {
  on() { }
}

const ipcRenderer = {
  on() { },
  send() { }
}

class Menu {
  buildFromTemplate() { }
  getApplicationMenu() {
    return {}
  }
  setApplicationMenu() { }
}

class MenuItem { }

const remote = {
  app,
  clipboard,
  dialog,
  getCurrentWebContents() { },
  getCurrentWindow() {
    return new BrowserWindow()
  },
  globalShortcut,
  Menu,
  MenuItem,
  require() { },
  process
}

const shell = {
  openExternal() {
    return true
  },
  openItem() {
    return true
  }
}

module.exports = {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  Event: null,
  globalShortcut,
  ipcMain,
  ipcRenderer,
  Menu,
  MenuItem,
  MenuItemConstructorOptions: null,
  remote,
  shell,
  TouchBar: {
    TouchBarButton() { }
  }
}
