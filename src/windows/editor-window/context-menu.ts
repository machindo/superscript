import * as remote from '@electron/remote'
import { ContextMenuParams } from 'electron'
import Quill from 'quill'
import Delta = require('quill-delta')
import { Superscript } from 'windows/superscript'

import { EditorPane } from './editor-pane/editor-pane'
import { SuperscriptAsYouType } from './editor-pane/superscript.quill'
import { renderer } from './renderer'

const { Menu, MenuItem } = remote

export class ContextMenu {
  editor: Quill
  params: ContextMenuParams

  constructor(private editorPane: EditorPane) {
    this.editor = editorPane.editor

    // Get context menu params, which includes spell checker info
    renderer.webContents.on('context-menu', (_event, params) => {
      this.params = params
    })

    this.editor.root.addEventListener('contextmenu', () =>
      // Set timeout to make sure params gets assigned first
      setTimeout(() => {
        const menu = this.createMenu()
        menu.popup({ window: renderer.win })
      }, 200)
    )
  }

  createMenu() {
    const menu = new Menu()
    const selectionRange = this.editor.getSelection()
    const selectionText = selectionRange ? this.editor.getText(selectionRange.index, selectionRange.length).trim() : ''

    menu.append(new MenuItem({
      label: 'Undo',
      accelerator: 'CmdOrCtrl+Z',
      role: 'undo'
    }))

    menu.append(new MenuItem({
      label: 'Redo',
      accelerator: 'Shift+CmdOrCtrl+Z',
      role: 'redo'
    }))

    menu.append(new MenuItem({ type: 'separator' }))

    menu.append(new MenuItem({
      label: 'Cut',
      accelerator: 'CmdOrCtrl+X',
      role: 'cut'
    }))

    menu.append(new MenuItem({
      label: 'Copy',
      accelerator: 'CmdOrCtrl+C',
      role: 'copy'
    }))

    menu.append(new MenuItem({
      label: 'Paste',
      accelerator: 'CmdOrCtrl+V',
      role: 'paste'
    }))

    menu.append(new MenuItem({
      label: 'Select All',
      accelerator: 'CmdOrCtrl+A',
      click: () => {
        this.editor.setSelection(0, this.editor.getLength())
      }
    }))

    menu.append(new MenuItem({ type: 'separator' }))

    menu.append(new MenuItem({
      label: 'Insert comment',
      enabled: renderer.editable,
      accelerator: 'CmdOrCtrl+/',
      click: () => renderer.insertComment()
    }))

    menu.append(new MenuItem({
      label: 'Insert image',
      enabled: renderer.editable,
      accelerator: 'CmdOrCtrl+Shift+I',
      click: renderer.insertImage
    }))

    menu.append(new MenuItem({ type: 'separator' }))

    const superscriptModule: SuperscriptAsYouType = this.editor.getModule('superscript')
    const frontmatter = superscriptModule.splitFrontmatter().text
    const attributes = Superscript.parseFrontmatter(frontmatter)

    if (!attributes.$characters.includes(selectionText)) {
      menu.append(new MenuItem({
        label: 'Add to characters list',
        click: () => {
          superscriptModule.appendFrontmatterValue('characters', selectionText)
        }
      }))
    }

    if (!attributes.$vocabulary.includes(selectionText)) {
      menu.append(new MenuItem({
        label: 'Add to vocabulary list',
        click: () => {
          superscriptModule.appendFrontmatterValue('vocabulary', selectionText)
        }
      }))
    }

    if (selectionText.length > 0 && !/\s/.test(selectionText)) {
      menu.append(new MenuItem({ type: 'separator' }))

      menu.append(new MenuItem({
        label: `Define "${selectionText}"`,
        click: () => {
          this.editorPane.showDictionaryToolbar(selectionText)
        }
      }))
    }

    menu.append(new MenuItem({ type: 'separator' }))

    if (this.params?.misspelledWord) {
      menu.append(new MenuItem({
        label: `Learn "${this.params.misspelledWord}"`,
        click: () => this.editorPane.addWordsToDictionary([this.params.misspelledWord])
      }))

      menu.append(new MenuItem({ type: 'separator' }))

      if (this.params.dictionarySuggestions.length) {
        menu.append(new MenuItem({
          label: 'Replace with …',
          enabled: false
        }))

        for (const suggestion of this.params.dictionarySuggestions) {
          menu.append(new MenuItem({
            label: `"${suggestion}"`,
            click: () => {
              if (selectionRange) {
                const delta = new Delta().retain(selectionRange.index).delete(selectionRange.length).insert(suggestion)
                this.editor.updateContents(delta, 'user')
              }
            }
          }))
        }
      } else {
        menu.append(new MenuItem({
          label: 'No suggestions',
          enabled: false
        }))
      }
    } else if (this.params && !/\s/.test(selectionText)) {
      menu.append(new MenuItem({
        label: `Unlearn "${selectionText}"`,
        click: () => renderer.webContents.session.removeWordFromSpellCheckerDictionary(selectionText)
      }))
    }

    return menu
  }
}
