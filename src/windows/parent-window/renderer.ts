import * as remote from '@electron/remote'
import { autobind } from 'core-decorators'
import { BrowserWindow, Event as ElectronEvent, ipcRenderer } from 'electron'
import Vue from 'vue'

import store from './store'
import { Ui } from './ui/ui'

Vue.config.devtools = false
Vue.config.productionTip = false

@autobind
class Renderer {
  isClosing = false
  doForceClose = false
  ui: Ui
  win: BrowserWindow

  constructor() {
    this.init()
  }

  // Set isClosing to true to differenciate closing from reloading
  beforeClose(_event: ElectronEvent) {
    this.isClosing = this.doForceClose ? false : true
  }

  beforeUnload(event: Event) {
    if (this.isClosing) {
      event.returnValue = false
      this.closeAllTabs()
    }

    this.isClosing = false
  }

  async closeAllTabs() {
    this.ui.doStore = false

    while (this.ui.tabs.length) {
      try {
        await new Promise<void>((resolve, reject) => {
          const tab = this.ui.activeTab
          tab.send('close')
          tab.on('cancelRemoval', () => { reject() })
          tab.on('removed', () => { resolve() })
        })
      } catch {
        this.ui.doStore = true
        break
      }
    }
  }

  async forceClose() {
    this.doForceClose = true
    this.win.close()
  }

  private async init() {
    this.ui = new Ui({
      el: '#renderer-ui',
      store
    })

    this.win = remote.getCurrentWindow()

    this.win.on('close', this.beforeClose)
    this.win.on('focus', () => this.ui.send('focus'))
    window.addEventListener('beforeunload', this.beforeUnload)

    ipcRenderer.on('createTab', (_event: ElectronEvent, initialCommand: string, initialCommandArgument?: any) => this.ui.createTab({ initialCommand, initialCommandArgument }))
    ipcRenderer.on('closeTab', () => this.ui.closeTab())
    ipcRenderer.on('selectNextTab', this.ui.selectNextTab)
    ipcRenderer.on('selectPreviousTab', this.ui.selectPreviousTab)

    // Pass the following events to the active tab
    ipcRenderer.on('compareFile', () => this.ui.send('compareFile'))
    ipcRenderer.on('decreaseFontSize', () => this.ui.send('decreaseFontSize'))
    ipcRenderer.on('increaseFontSize', () => this.ui.send('increaseFontSize'))
    ipcRenderer.on('insertComment', () => this.ui.send('insertComment'))
    ipcRenderer.on('insertImage', () => this.ui.send('insertImage'))
    ipcRenderer.on('openFile', () => this.ui.send('openFile'))
    ipcRenderer.on('openNew', () => this.ui.send('openNew'))
    ipcRenderer.on('openExportWindow', () => this.ui.send('openExportWindow'))
    ipcRenderer.on('print', () => this.ui.send('print'))
    ipcRenderer.on('redo', () => this.ui.send('redo'))
    ipcRenderer.on('resetFontSize', () => this.ui.send('resetFontSize'))
    ipcRenderer.on('revertFile', () => this.ui.send('revertFile'))
    ipcRenderer.on('saveFile', () => this.ui.send('saveFile'))
    ipcRenderer.on('saveFileAs', () => this.ui.send('saveFileAs'))
    ipcRenderer.on('bold', () => this.ui.send('bold'))
    ipcRenderer.on('italic', () => this.ui.send('italic'))
    ipcRenderer.on('underline', () => this.ui.send('underline'))
    ipcRenderer.on('strike', () => this.ui.send('strike'))
    ipcRenderer.on('ul', () => this.ui.send('ul'))
    ipcRenderer.on('ol', () => this.ui.send('ol'))
    ipcRenderer.on('outdent', () => this.ui.send('outdent'))
    ipcRenderer.on('indent', () => this.ui.send('indent'))
    ipcRenderer.on('reloadTab', () => this.ui.send('reload'))
    ipcRenderer.on('showLobby', () => this.ui.send('showLobby'))
    ipcRenderer.on('showPreferences', () => this.ui.send('showPreferences'))
    ipcRenderer.on('toggleAutocomplete', () => this.ui.send('toggleAutocomplete'))
    ipcRenderer.on('toggleFormatToolbar', () => this.ui.send('toggleFormatToolbar'))
    ipcRenderer.on('toggleLettererToolbar', () => this.ui.send('toggleLettererToolbar'))
    ipcRenderer.on('toggleCharacterNumbers', () => this.ui.send('toggleCharacterNumbers'))
    ipcRenderer.on('toggleDictionaryToolbar', () => this.ui.send('toggleDictionaryToolbar'))
    ipcRenderer.on('toggleTabDevTools', () => this.ui.send('toggleDevTools'))
    ipcRenderer.on('toggleWordCount', () => this.ui.send('toggleWordCount'))
    ipcRenderer.on('triggerFind', () => this.ui.send('triggerFind'))
    ipcRenderer.on('triggerGoTo', () => this.ui.send('triggerGoTo'))
    ipcRenderer.on('undo', () => this.ui.send('undo'))
    ipcRenderer.on('updateMenuItems', () => this.ui.send('updateMenuItems'))
  }
}

export const renderer = new Renderer()
