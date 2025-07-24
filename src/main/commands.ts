import { app, BrowserWindow, dialog, MenuItem, shell } from 'electron'
import fs from 'fs-extra'
import path from 'path'
import { Settings } from 'shared/settings'

import { createWindow } from './window'

export namespace Commands {
  function sendToFocusedWindow(command: string, ...args: any[]): BrowserWindow | null {
    const win = BrowserWindow.getFocusedWindow()

    if (win) {
      win.webContents.send(command, ...args)
    }

    return win
  }

  export function newWindow() {
    createWindow('{lobby}')
  }

  export async function newTab(): Promise<BrowserWindow> {
    const win: BrowserWindow = sendToFocusedWindow('createTab', 'showLobby') || await createWindow('{lobby}')
    return win
  }

  export function closeTab() {
    sendToFocusedWindow('closeTab')
  }

  export async function newDocument(): Promise<BrowserWindow> {
    const win: BrowserWindow = sendToFocusedWindow('createTab', 'openNew') || await createWindow('{new-doc}')
    return win
  }

  export async function preferencesWindow(): Promise<BrowserWindow> {
    const win: BrowserWindow = sendToFocusedWindow('createTab', 'preferences') || await createWindow('{preferences}')
    return win
  }

  export async function openFile() {
    const { filePaths } = await dialog.showOpenDialog({
      filters: [
        { name: 'Superscript Document', extensions: ['sup'] }
      ],
      properties: [
        'openFile',
        'multiSelections'
      ]
    })

    if (filePaths) {
      filePaths.forEach((filePath) => {
        openFilename(filePath)
      })
    }
  }

  export async function openFilename(filename: string): Promise<BrowserWindow> {
    const win: BrowserWindow = sendToFocusedWindow('createTab', 'openFile', filename) || await createWindow(filename)
    return win
  }

  export function compareFile() {
    sendToFocusedWindow('compareFile')
  }

  export function print() {
    sendToFocusedWindow('print')
  }

  export function exportWindow() {
    sendToFocusedWindow('openExportWindow')
  }

  export function revertFile() {
    sendToFocusedWindow('revertFile')
  }

  export function saveFile() {
    sendToFocusedWindow('saveFile')
  }

  export function saveFileAs() {
    sendToFocusedWindow('saveFileAs')
  }

  export function toggleAutosave(menuItem: MenuItem) {
    Settings.set('autosave', menuItem.checked)
  }

  export function undo() {
    sendToFocusedWindow('undo')
  }

  export function redo() {
    sendToFocusedWindow('redo')
  }

  export function triggerFind() {
    sendToFocusedWindow('triggerFind')
  }

  export function triggerGoTo() {
    sendToFocusedWindow('triggerGoTo')
  }

  export function toggleAutocomplete() {
    sendToFocusedWindow('toggleAutocomplete')
  }

  export function bold() {
    sendToFocusedWindow('bold')
  }

  export function italic() {
    sendToFocusedWindow('italic')
  }

  export function underline() {
    sendToFocusedWindow('underline')
  }

  export function strike() {
    sendToFocusedWindow('strike')
  }

  export function toggleLetterCase() {
    sendToFocusedWindow('toggleLetterCase')
  }

  export function ul() {
    sendToFocusedWindow('ul')
  }

  export function ol() {
    sendToFocusedWindow('ol')
  }

  export function outdent() {
    sendToFocusedWindow('outdent')
  }

  export function indent() {
    sendToFocusedWindow('indent')
  }

  export function insertComment() {
    sendToFocusedWindow('insertComment')
  }

  export function insertImage() {
    sendToFocusedWindow('insertImage')
  }

  export function triggerFindNext() {
    sendToFocusedWindow('triggerFindNext')
  }

  export function triggerFindPrevious() {
    sendToFocusedWindow('triggerFindPrevious')
  }

  export function triggerReplace() {
    sendToFocusedWindow('triggerReplace')
  }

  export function triggerReplaceAll() {
    sendToFocusedWindow('triggerReplaceAll')
  }

  export function toggleDictionaryToolbar() {
    sendToFocusedWindow('toggleDictionaryToolbar')
  }

  export function toggleDiffToolbar() {
    sendToFocusedWindow('toggleDiffToolbar')
  }

  export function toggleFormatToolbar() {
    sendToFocusedWindow('toggleFormatToolbar')
  }

  export function toggleLettererToolbar() {
    sendToFocusedWindow('toggleLettererToolbar')
  }

  export function toggleCharacterNumbers() {
    sendToFocusedWindow('toggleCharacterNumbers')
  }

  export function toggleWordCount() {
    sendToFocusedWindow('toggleWordCount')
  }

  export function decreaseFontSize() {
    sendToFocusedWindow('decreaseFontSize')
  }

  export function increaseFontSize() {
    sendToFocusedWindow('increaseFontSize')
  }

  export function resetFontSize() {
    sendToFocusedWindow('resetFontSize')
  }

  export function reloadTab() {
    sendToFocusedWindow('reloadTab')
  }

  export function toggleTabDevTools() {
    sendToFocusedWindow('toggleTabDevTools')
  }

  export function selectNextTab() {
    sendToFocusedWindow('selectNextTab')
  }

  export function selectPreviousTab() {
    sendToFocusedWindow('selectPreviousTab')
  }

  export function openAboutWebsite() {
    shell.openExternal('https://www.superscript.app')
  }

  export function openEmail() {
    const logDirPath = app.getPath('logs')
    const logPath = path.join(logDirPath, 'log.log')
    const log = fs.pathExistsSync(logPath) ? fs.readFileSync(logPath, 'utf8').replace('\n', '%0A') : ''
    shell.openExternal(`mailto:support@superscript.app?subject=Superscript bug or feature&body=%0A
%0A
** Including the following data will allow us to help you quicker. **%0A
App version: ${app.getVersion()}%0A
%0A
** Your error log is copied below. Please include this in bug reports. You may delete it for feature requests. **%0A
${log}
`)
  }

  export async function openTour() {
    await Settings.set('hideTour', false)
    newDocument()
  }
}
