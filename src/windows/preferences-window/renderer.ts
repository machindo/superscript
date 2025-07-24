import * as remote from '@electron/remote'
import { autobind } from 'core-decorators'
import { ipcRenderer } from 'electron'
import delay from 'lodash-decorators/delay'
import { Settings } from 'shared/settings'
import Vue from 'vue'
import { getCurrentWindow } from 'windows/get-current-window'

import '../fonts.styl'
import '../renderer.styl'

import store from './store'
import { Ui, uiComponents } from './ui/ui'

Vue.config.devtools = false
Vue.config.productionTip = false

@autobind
class Renderer {
  ui: Ui
  win: Electron.BrowserWindow | null

  constructor() {
    this.init()
  }

  async close() {
    Settings.unwatchAll()
    ipcRenderer.sendToHost('removeTab')
  }

  updateMenuItems() {
    const menu = remote.Menu.getApplicationMenu()!

    menu.getMenuItemById('save')!.enabled = false
    menu.getMenuItemById('saveAs')!.enabled = false
    menu.getMenuItemById('autosave')!.enabled = false
    menu.getMenuItemById('revert')!.enabled = false
    menu.getMenuItemById('export')!.enabled = false
    menu.getMenuItemById('print')!.enabled = false

    menu.getMenuItemById('undo')!.enabled = false
    menu.getMenuItemById('redo')!.enabled = false
    menu.getMenuItemById('find')!.enabled = false
    menu.getMenuItemById('autocomplete')!.enabled = false

    menu.getMenuItemById('bold')!.enabled = false
    menu.getMenuItemById('bold')!.checked = false
    menu.getMenuItemById('italic')!.enabled = false
    menu.getMenuItemById('italic')!.checked = false
    menu.getMenuItemById('underline')!.enabled = false
    menu.getMenuItemById('underline')!.checked = false
    menu.getMenuItemById('strike')!.enabled = false
    menu.getMenuItemById('strike')!.enabled = false
    menu.getMenuItemById('strike')!.enabled = false
    menu.getMenuItemById('toggleLetterCase')!.checked = false
    menu.getMenuItemById('ul')!.enabled = false
    menu.getMenuItemById('ol')!.enabled = false
    menu.getMenuItemById('outdent')!.enabled = false
    menu.getMenuItemById('indent')!.enabled = false

    menu.getMenuItemById('insertComment')!.enabled = false
    menu.getMenuItemById('insertImage')!.enabled = false

    menu.getMenuItemById('toggleFormatToolbar')!.enabled = false
    menu.getMenuItemById('toggleLettererToolbar')!.enabled = false

    menu.getMenuItemById('toggleCharacterNumbers')!.enabled = false
    menu.getMenuItemById('toggleDictionaryToolbar')!.enabled = false
    menu.getMenuItemById('toggleWordCount')!.enabled = false
    menu.getMenuItemById('decreaseFontSize')!.enabled = false
    menu.getMenuItemById('increaseFontSize')!.enabled = false
    menu.getMenuItemById('resetFontSize')!.enabled = false
  }

  // Delay execution so that renderer gets constructed before attaching descendants that rely on renderer
  @delay(0)
  private async init() {
    this.win = getCurrentWindow()

    this.ui = new Ui({
      el: '#renderer-ui',
      components: uiComponents,
      store
    })

    ipcRenderer.on('close', this.close)
    ipcRenderer.on('focus', () => {
      this.win?.setTitle('Preferences')
      this.updateMenuItems()
    })
    ipcRenderer.on('updateMenuItems', this.updateMenuItems)

    ipcRenderer.on('reload', () => remote.getCurrentWebContents().reload())
    ipcRenderer.on('toggleDevTools', () => remote.getCurrentWebContents().toggleDevTools())

    ipcRenderer.sendToHost('doneInit')
  }
}

export const renderer = new Renderer()
