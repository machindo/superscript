import * as remote from '@electron/remote'
import { autobind } from 'core-decorators'
import { BrowserWindow, ipcRenderer, WebContents } from 'electron'
import { Debounce, debounce } from 'lodash-decorators/debounce'
import delay from 'lodash-decorators/delay'
import path from 'path'
import { DeltaStatic } from 'quill'
import { Settings } from 'shared/settings'
import Vue from 'vue'
import { getCurrentWindow } from 'windows/get-current-window'

import '../fonts.styl'
import '../renderer.styl'
import { SuperscriptComment } from '../superscript.types'

import { Files, SuperscriptFile } from './file/file'
import store from './store'
import newDoc from './templates/new-doc.json'
import { Ui, uiComponents } from './ui/ui'

Vue.config.devtools = false
Vue.config.productionTip = false

enum ExitOption {
  SaveAndQuit = 0,
  Quit,
  Cancel
}

enum RecoverOption {
  Recover = 0,
  Cancel
}

@autobind
class Renderer {
  comments: SuperscriptComment[] = []
  editable = true
  file: SuperscriptFile
  fileOpened = false
  ui: Ui
  webContents: WebContents
  win: Electron.BrowserWindow

  constructor() {
    this.init()
  }

  onClose() {
    if (store.state.dirty) {
      const menu = remote.Menu.getApplicationMenu()!

      if (this.file.filename && menu.getMenuItemById('autosave')!.checked) {
        this.saveAndClose()
      } else {
        this.confirmClose()
      }
    } else {
      this.close()
    }
  }

  async saveAndClose() {
    try {
      const didSave = await this.save()

      if (didSave) {
        this.close()
      }
    } catch (e) {
      console.error(e)
      ipcRenderer.sendToHost('cancelRemoval')
    }
  }

  async confirmClose() {
    const { response } = await remote.dialog.showMessageBox(this.win, {
      type: 'none',
      buttons: this.file.filename
        ? ['Save and close', 'Discard changes', 'Cancel']
        : ['Save and close', 'Delete', 'Cancel'],
      title: 'Confirm',
      message: 'You have unsaved changes. What do you want to do?'
    })

    switch (response) {
      case ExitOption.SaveAndQuit:
        await this.saveAndClose()
        break
      case ExitOption.Quit:
        this.close()
        break
      case ExitOption.Cancel:
        ipcRenderer.sendToHost('cancelRemoval')
    }
  }

  async close() {
    this.ui.$refs.editorPane.unregisterGlobalShortcuts()
    Settings.unwatchAll()
    await this.file.close()
    ipcRenderer.sendToHost('removeTab')
  }

  setBasePath(path: string) {
    document.head.getElementsByTagName('base')[0].href = path
  }

  // File methods
  async newFile() {
    this.setBasePath(this.file.tempDirectory)
    document.title = 'Untitled'
    this.win.setTitle('Untitled')
    this.ui.$refs.editorPane.setContents(newDoc.delta, 'silent')
    store.dispatch('ui/showEditor')
    this.win.setDocumentEdited(false)

    const showTour = !(await Settings.get<boolean>('hideTour', false))

    if (showTour) {
      this.ui.startTour()
    }
  }

  async openFile(filename: string): Promise<boolean> {
    // Prevent trying to open the file twice
    if (this.fileOpened) return false

    this.fileOpened = true

    this.file.onRead = fileDelta => {
      this.ui.$refs.editorPane.editor.setContents(fileDelta, 'user')
      this.ui.$refs.editorPane.$refs.commentPanel.setCommentPositions()
    }

    const contents = await this.file.open(filename)

    if (contents?.delta) {
      // @ts-ignore we've already confirmed that contents.delta exists
      this.loadFileContents(filename, contents)

      return true
    } else if (contents?.recoverable) {
      const { response } = await remote.dialog.showMessageBox(this.win, {
        type: 'none',
        buttons: ['Recover', 'Cancel'],
        title: 'File recovery',
        message: `${filename} seems to be corrupted but may be recoverable. Would you like to attempt to recover it?`
      })

      if (response === RecoverOption.Recover) {
        const recoveredContents = await this.file.recoverCorruptFile()

        if (recoveredContents && recoveredContents.delta) {
          // @ts-ignore we've already recoveredContents that contents.delta exists
          this.loadFileContents(filename, recoveredContents)
        } else {
          alert('Recovery failed')
        }
      }

      return false
    } else {
      alert(
        `Superscript cannot open ${filename}. It's either missing or not a Superscript file.`
      )

      if (!store.state.ui.view) {
        this.close()
      }

      return false
    }
  }

  async loadFileContents(filename: string, contents: { comments?: SuperscriptComment[], delta: DeltaStatic }) {
    // Set base URI for <img> tags
    this.setBasePath(this.file.tempDirectory)

    // Replace backslashes in image paths with forward slash (for scripts saved on Windows)
    contents.delta.ops?.forEach(op => {
      if (op.insert.image) {
        op.insert.image = op.insert.image.replace(/\\/g, '/')
      }
    })

    this.ui.$refs.editorPane.setContents(contents.delta, 'silent')
    store.dispatch('ui/showEditor')
    this.win.setDocumentEdited(false)

    if (contents.comments) {
      // Make sure comments is empty to avoid duplicates (sometimes openFile is called more than once)
      this.comments.splice(0, this.comments.length, ...contents.comments)
    }

    ipcRenderer.sendToHost('updateFilename', filename)
  }

  @Debounce(5000)
  async autosave(): Promise<boolean> {
    const menu = remote.Menu.getApplicationMenu()!

    this.saveBackup()

    if (this.file.filename && menu.getMenuItemById('autosave')?.checked) {
      return this.save()
    }

    return false
  }

  async saveBackup() {
    if (this.file.filename) {
      const delta = this.ui.$refs.editorPane.editor.getContents()
      await this.file.storeBackup(Files.Script, { comments: this.comments, delta })
      this.win.setDocumentEdited(false)
    }
  }

  // Resolves true if saved, false if not saved
  async save(): Promise<boolean> {
    // Make sure we don't save search highlights to the file
    this.ui.$refs.searchToolbar.clearHighlights()

    if (this.file.filename) {
      const delta = this.ui.$refs.editorPane.editor.getContents()
      await this.file.store(Files.Script, { comments: this.comments, delta })
      this.win.setDocumentEdited(false)
    } else {
      const didSave = await this.saveAs()

      if (!didSave) {
        return false
      }
    }

    store.dispatch('updateDirty', false)
    ipcRenderer.sendToHost('updateDirty', false)

    return true
  }

  @debounce(1000)
  async savePreferences() {
    this.file.store(Files.Preferences, { bookmarks: this.ui.$refs.editorPane.$refs.outlinePanel.bookmarks, scrollTop: this.ui.$refs.editorPane.$el.scrollTop })
  }

  // Resolves true if saved, false if not saved
  async saveAs(): Promise<boolean> {
    const titleMatch = this.ui.$refs.editorPane.editor.getText().match(/^[^\n]*/)
    const title = titleMatch ? titleMatch[0] : ''

    const { filePath } = await remote.dialog.showSaveDialog(this.win, {
      defaultPath: this.file.filename ? this.file.filename : title,
      title: 'Save as...',
      filters: [{ name: 'Superscript Document', extensions: ['sup'] }]
    })

    if (filePath) {
      this.file.setDocument(filePath)
      const saveSuccessful = await this.save()

      // Rename tempDirectory name for later recovery
      if (saveSuccessful) {
        await this.file.renameTempDirectory()
      }

      return saveSuccessful
    }

    return false
  }

  async showOpenFileDialog() {
    const { filePaths } = await remote.dialog.showOpenDialog(this.win, {
      filters: [{ name: 'Superscript Document', extensions: ['sup'] }],
      properties: ['openFile']
    })

    if (filePaths && filePaths.length) {
      this.openFile(filePaths[0])
    }
  }

  async compareFile() {
    const { filePaths } = await remote.dialog.showOpenDialog(this.win, {
      filters: [{ name: 'Superscript Document', extensions: ['sup'] }],
      properties: ['openFile']
    })

    if (filePaths && filePaths.length) {
      const comparisonFile = new SuperscriptFile()
      const contents = await comparisonFile.read(filePaths[0])

      if (contents.delta) {
        this.ui.$refs.diffToolbar.compare(filePaths[0], contents.delta)
      } else {
        alert(
          `Superscript cannot open ${filePaths[0]
          }. It doesn't seem to be in the right format.`
        )
      }
    }
  }

  revert() {
    this.ui.$refs.editorPane.editor.setContents(this.file.savedScriptContents.delta, 'user')
    this.ui.$refs.editorPane.$refs.commentPanel.setCommentPositions()
  }

  async openExportWindow(): Promise<BrowserWindow> {
    const exportWindowId = await ipcRenderer.invoke('createExportWindow', {
      baseFilename: this.file.filename ? this.file.filename.replace(/\.[^/.]+$/, '') : '',
      contents: JSON.parse(JSON.stringify(this.ui.$refs.editorPane.editor.getContents())),
      parentId: this.win.id,
      tempDirectory: this.file.tempDirectory
    })

    const exportWindow = remote.BrowserWindow.fromId(exportWindowId)!

    const titleMatch = this.ui.$refs.editorPane.editor.getText().match(/^[^\n]*/)
    const title = titleMatch ? titleMatch[0] : ''
    const baseFilename = this.file.filename ? this.file.filename.replace(/\.[^/.]+$/, '') : title

    exportWindow.on('ready-to-show', () => {
      exportWindow.webContents.send('setVars', {
        baseFilename,
        // Convert to a basic JS object
        contents: JSON.parse(JSON.stringify(this.ui.$refs.editorPane.editor.getContents())),
        tempDirectory: this.file.tempDirectory
      })
      exportWindow.show()
    })

    await exportWindow.loadFile(path.join(__dirname, 'export.html'))

    return exportWindow
  }

  async print() {
    const exportWindow = await this.openExportWindow()
    exportWindow.webContents.send('print')
  }

  // Edit methods
  undo() {
    const editor = this.ui.$refs.editorPane.editor
    editor.getModule('history').undo()
  }

  redo() {
    const editor = this.ui.$refs.editorPane.editor
    editor.getModule('history').redo()
  }

  insertComment() {
    if (store.state.ui.view !== 'editor') {
      return
    }

    this.ui.$refs.editorPane.createComment()
  }

  async insertImage() {
    if (store.state.ui.view !== 'editor') {
      return
    }

    const { filePaths } = await remote.dialog.showOpenDialog(
      remote.getCurrentWindow(),
      {
        title: 'Import image',
        properties: ['openFile', 'multiSelections'],
        filters: [
          {
            name: 'Images',
            extensions: ['jpg', 'jpeg', 'png']
          }
        ]
      }
    )

    if (filePaths) {
      for (const filePath of filePaths) {
        const relativePath = await this.file.importAsset(filePath)

        if (relativePath) {
          const selection = this.ui.$refs.editorPane.editor.getSelection()

          if (selection) {
            this.ui.$refs.editorPane.editor.insertEmbed(
              selection.index,
              'image',
              relativePath,
              'user'
            )
          }
        }
      }
    }
  }

  // View methods
  increaseFontSize() {
    const editorStyle = window.getComputedStyle(document.documentElement)
    const fontSize = parseInt(editorStyle.getPropertyValue('--font-size'), 10)
    const maxFontSize = parseInt(
      editorStyle.getPropertyValue('--maximum-font-size'),
      10
    )

    if (fontSize < maxFontSize) {
      document.documentElement.style.setProperty(
        '--font-size',
        `${fontSize + 2}px`
      )
    }
  }

  decreaseFontSize() {
    const editorStyle = window.getComputedStyle(document.documentElement)
    const fontSize = parseInt(editorStyle.getPropertyValue('--font-size'), 10)
    const minFontSize = parseInt(
      editorStyle.getPropertyValue('--minimum-font-size'),
      10
    )

    if (fontSize > minFontSize) {
      document.documentElement.style.setProperty(
        '--font-size',
        `${fontSize - 2}px`
      )
    }
  }

  resetFontSize() {
    const editorStyle = window.getComputedStyle(document.documentElement)
    const defaultFontSize = editorStyle.getPropertyValue('--default-font-size')
    document.documentElement.style.setProperty('--font-size', defaultFontSize)
  }

  updateMenuItems(currentStyles?: any) {
    const menu = remote.Menu.getApplicationMenu()!

    menu.getMenuItemById('save')!.enabled = store.state.ui.view === 'editor'
    menu.getMenuItemById('saveAs')!.enabled = store.state.ui.view === 'editor'
    menu.getMenuItemById('autosave')!.enabled = true
    menu.getMenuItemById('revert')!.enabled = store.state.ui.view === 'editor'
    menu.getMenuItemById('export')!.enabled = store.state.ui.view === 'editor'
    menu.getMenuItemById('print')!.enabled = store.state.ui.view === 'editor'

    menu.getMenuItemById('undo')!.enabled = store.state.ui.view === 'editor'
    menu.getMenuItemById('redo')!.enabled = store.state.ui.view === 'editor'
    menu.getMenuItemById('find')!.enabled = store.state.ui.view === 'editor'
    // menu.getMenuItemById('goTo')!.enabled = store.state.ui.view === 'editor'
    menu.getMenuItemById('autocomplete')!.enabled = store.state.ui.view === 'editor'

    menu.getMenuItemById('bold')!.enabled = store.state.ui.view === 'editor' && currentStyles && !currentStyles.frontmatter && !currentStyles.header
    menu.getMenuItemById('bold')!.checked = currentStyles && currentStyles.bold as boolean
    menu.getMenuItemById('italic')!.enabled = store.state.ui.view === 'editor' && currentStyles && !currentStyles.frontmatter && !currentStyles.header
    menu.getMenuItemById('italic')!.checked = currentStyles && currentStyles.italic as boolean
    menu.getMenuItemById('underline')!.enabled = store.state.ui.view === 'editor' && currentStyles && !currentStyles.frontmatter && !currentStyles.header
    menu.getMenuItemById('underline')!.checked = currentStyles && currentStyles.underline as boolean
    menu.getMenuItemById('strike')!.enabled = store.state.ui.view === 'editor' && currentStyles && !currentStyles.frontmatter && !currentStyles.header
    menu.getMenuItemById('strike')!.checked = currentStyles && currentStyles.strike as boolean
    menu.getMenuItemById('ul')!.enabled = store.state.ui.view === 'editor' && currentStyles && !currentStyles.frontmatter && !currentStyles.header && !currentStyles.blockquote
    menu.getMenuItemById('ol')!.enabled = store.state.ui.view === 'editor' && currentStyles && !currentStyles.frontmatter && !currentStyles.header && !currentStyles.blockquote
    menu.getMenuItemById('outdent')!.enabled = store.state.ui.view === 'editor' && currentStyles && currentStyles.list && currentStyles.indent
    menu.getMenuItemById('indent')!.enabled = store.state.ui.view === 'editor' && currentStyles && currentStyles.list

    menu.getMenuItemById('insertComment')!.enabled = store.state.ui.view === 'editor'
    menu.getMenuItemById('insertImage')!.enabled = store.state.ui.view === 'editor'

    // menu.getMenuItemById('toggleDiffToolbar')!.enabled = store.state.ui.view === 'editor'
    menu.getMenuItemById('toggleFormatToolbar')!.enabled = store.state.ui.view === 'editor'
    menu.getMenuItemById('toggleLettererToolbar')!.enabled = store.state.ui.view === 'editor'

    menu.getMenuItemById('toggleCharacterNumbers')!.enabled = store.state.ui.view === 'editor'
    menu.getMenuItemById('toggleDictionaryToolbar')!.enabled = store.state.ui.view === 'editor'
    menu.getMenuItemById('toggleWordCount')!.enabled = store.state.ui.view === 'editor'
    menu.getMenuItemById('decreaseFontSize')!.enabled = store.state.ui.view === 'editor'
    menu.getMenuItemById('increaseFontSize')!.enabled = store.state.ui.view === 'editor'
    menu.getMenuItemById('resetFontSize')!.enabled = store.state.ui.view === 'editor'
  }

  // Delay execution so that renderer gets constructed before attaching descendants that rely on renderer
  @delay(0)
  private async init() {
    this.editable = true
    this.file = new SuperscriptFile()

    this.webContents = remote.getCurrentWebContents()
    this.win = getCurrentWindow()!

    this.ui = new Ui({
      el: '#renderer-ui',
      components: uiComponents,
      store
    })

    this.ui.comments = this.comments

    ipcRenderer.on('focus', () => {
      this.win.setTitle(document.title)
      this.updateMenuItems()
    })

    ipcRenderer.on('close', this.onClose)

    ipcRenderer.on('compareFile', this.compareFile)
    ipcRenderer.on('decreaseFontSize', this.decreaseFontSize)
    ipcRenderer.on('increaseFontSize', this.increaseFontSize)
    ipcRenderer.on('insertComment', this.insertComment)
    ipcRenderer.on('insertImage', this.insertImage)
    ipcRenderer.on('openFile', ({ }, filename: string) => {
      this.openFile(filename)
    })
    ipcRenderer.on('openNew', this.newFile)
    ipcRenderer.on('openExportWindow', this.openExportWindow)
    ipcRenderer.on('print', this.print)
    ipcRenderer.on('redo', this.redo)
    ipcRenderer.on('resetFontSize', this.resetFontSize)
    ipcRenderer.on('revertFile', this.revert)
    ipcRenderer.on('saveFile', this.save)
    ipcRenderer.on('saveFileAs', this.saveAs)

    ipcRenderer.on('bold', () => this.ui.$refs.formatToolbar.toggleStyle('bold'))
    ipcRenderer.on('italic', () => this.ui.$refs.formatToolbar.toggleStyle('italic'))
    ipcRenderer.on('underline', () => this.ui.$refs.formatToolbar.toggleStyle('underline'))
    ipcRenderer.on('strike', () => this.ui.$refs.formatToolbar.toggleStyle('strike'))
    ipcRenderer.on('ul', () => this.ui.$refs.formatToolbar.toggleList('bullet'))
    ipcRenderer.on('ol', () => this.ui.$refs.formatToolbar.toggleList('ordered'))
    ipcRenderer.on('outdent', () => this.ui.$refs.formatToolbar.indent(-1))
    ipcRenderer.on('indent', () => this.ui.$refs.formatToolbar.indent(1))

    ipcRenderer.on('reload', () => remote.getCurrentWebContents().reload())
    ipcRenderer.on('toggleDevTools', () => remote.getCurrentWebContents().toggleDevTools())

    ipcRenderer.on('showLobby', () => {
      document.title = 'New tab'
      store.dispatch('ui/showLobby')
    })

    // ipcRenderer.on('toggleDiffToolbar', () => store.dispatch('ui/toggleDiffToolbar'))
    ipcRenderer.on('toggleFormatToolbar', () => store.dispatch('ui/toggleFormatToolbar'))
    ipcRenderer.on('toggleLettererToolbar', () => store.dispatch('behavior/toggleLettererMode'))
    ipcRenderer.on('toggleCharacterNumbers', () => store.dispatch('ui/toggleCharacterNumbers'))
    ipcRenderer.on('toggleDictionaryToolbar', () => store.dispatch('ui/toggleDictionaryToolbar'))
    ipcRenderer.on('toggleWordCount', () => store.dispatch('ui/toggleWordCount'))
    ipcRenderer.on('togglePanelCount', () => store.dispatch('ui/togglePanelCount'))
    ipcRenderer.on('toggleAutocomplete', () => this.ui.$refs.editorPane.$refs.floatingMenu.toggle())
    ipcRenderer.on('triggerFind', () => {
      const selection = this.ui.$refs.editorPane.editor.getSelection()
      let searchText = ''

      if (selection && selection.length) {
        searchText = this.ui.$refs.editorPane.editor.getText(selection.index, selection.length)
      }

      store.dispatch('ui/showSearchToolbar', searchText)
    })
    ipcRenderer.on('triggerGoTo', () => {
      store.commit('ui/updateGoToToolbarVisible', true)
    })
    ipcRenderer.on('undo', this.undo)
    ipcRenderer.on('updateMenuItems', this.updateMenuItems)

    ipcRenderer.sendToHost('doneInit')
  }
}

export const renderer = new Renderer()
