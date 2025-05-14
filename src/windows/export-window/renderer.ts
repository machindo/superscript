import * as remote from '@electron/remote'
import { autobind } from 'core-decorators'
import { Event, ipcRenderer } from 'electron'
import fs from 'fs-extra'
import delay from 'lodash-decorators/delay'
import { DeltaStatic } from 'quill'
import Vue from 'vue'

import '../fonts.styl'
import '../renderer.styl'
import { ExportFileFormat } from '../superscript.formatting'

import { Docx } from './export/docx'
import { Md } from './export/md'
import { Rtf } from './export/rtf'
import { Txt } from './export/txt'
import store from './store'
import { Ui, uiComponents } from './ui/ui'

Vue.config.devtools = false
Vue.config.productionTip = false

const filters = {
  [ExportFileFormat.Markdown]: { name: 'Markdown (.md)', extensions: ['md'] },
  [ExportFileFormat.Pdf]: { name: 'PDF (.pdf)', extensions: ['pdf'] },
  [ExportFileFormat.Text]: { name: 'Plain Text (.txt)', extensions: ['txt'] },
  [ExportFileFormat.Richtext]: { name: 'Rich Text Format (.rtf)', extensions: ['rtf'] },
  [ExportFileFormat.Docx]: { name: 'Word Document (.docx)', extensions: ['docx'] }
}

@autobind
class Renderer {
  baseFilename: string
  contents: DeltaStatic
  tempDirectory: string
  textContents: string
  ui: Ui
  win: Electron.BrowserWindow

  constructor() {
    this.init()
  }

  print() {
    // Set timeout to give exportSettings a chance to load
    setTimeout(async () => {
      this.ui.exportSettings!.exportFileFormat = ExportFileFormat.Pdf

      this.ui.readyToPrintPromise.then(() => {
        this.win.webContents.print()
      })
    }, 100)
  }

  async save(): Promise<boolean> {
    const { filePath } = await remote.dialog.showSaveDialog(this.win, {
      title: this.win.getTitle(),
      buttonLabel: 'Export',
      defaultPath: `${this.baseFilename}.${filters[this.ui.exportSettings!.exportFileFormat].extensions[0]}`,
      filters: [
        filters[this.ui.exportSettings!.exportFileFormat]
      ],
      nameFieldLabel: 'Export As'
    })

    if (filePath) {
      switch (this.ui.exportSettings!.exportFileFormat) {
        case ExportFileFormat.Docx:
          await this.exportAsDocx(filePath)
          break
        case ExportFileFormat.Markdown:
          await this.exportAsMd(filePath)
          break
        case ExportFileFormat.Pdf:
          await this.exportAsPdf(filePath)
          break
        case ExportFileFormat.Richtext:
          await this.exportAsRtf(filePath)
          break
        case ExportFileFormat.Text:
          await this.exportAsTxt(filePath)
      }

      return true
    } else {
      return false
    }
  }

  async exportAsDocx(filename: string): Promise<void> {
    const docx = new Docx(
      this.contents,
      this.ui.exportSettings!,
      this.tempDirectory
    )
    return docx.export(filename)
  }

  async exportAsMd(filename: string): Promise<void> {
    const md = new Md(this.contents, this.ui.exportSettings!)
    return fs.writeFile(filename, md.contents, 'UTF-8')
  }

  async exportAsPdf(filename: string): Promise<void> {
    return fs.writeFile(filename, this.ui.$refs.exportPreviewer.pdfBuffer, 'UTF-8')
  }

  async exportAsRtf(filename: string): Promise<void> {
    const rtf = new Rtf(this.contents)
    return fs.writeFile(filename, rtf.contents, 'UTF-8')
  }

  async exportAsTxt(filename: string): Promise<void> {
    const txt = new Txt(this.contents, this.ui.exportSettings!)
    return fs.writeFile(filename, txt.contents, 'UTF-8')
  }

  close() {
    remote.getCurrentWindow().close()
  }

  setVars(_event: Event, params: { baseFilename: string, contents: DeltaStatic, tempDirectory: string }) {
    this.baseFilename = params.baseFilename
    this.contents = params.contents
    this.tempDirectory = params.tempDirectory
    this.ui.$refs.exportPreviewer.renderPreview()
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

    menu.getMenuItemById('bold')!.enabled = false
    menu.getMenuItemById('bold')!.checked = false
    menu.getMenuItemById('italic')!.enabled = false
    menu.getMenuItemById('italic')!.checked = false
    menu.getMenuItemById('underline')!.enabled = false
    menu.getMenuItemById('underline')!.checked = false
    menu.getMenuItemById('strike')!.enabled = false
    menu.getMenuItemById('strike')!.checked = false
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
    this.ui = new Ui({
      el: '#renderer-ui',
      components: uiComponents,
      store
    })

    this.win = remote.getCurrentWindow()
    this.win.on('focus', this.updateMenuItems)

    ipcRenderer.on('print', () => this.print())
    ipcRenderer.on('setVars', (event, params) => this.setVars(event, params))

    window.addEventListener('keyup', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.win.close()
      }
    })
  }
}

export const renderer = new Renderer()
