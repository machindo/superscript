import { enable as enableRemote } from '@electron/remote/main'
import { BrowserWindow } from 'electron'

export type ExportWindowOptions = {
  parentId: number
}

export const createExportWindow = async ({ parentId }: ExportWindowOptions) => {
  const exportWindow = new BrowserWindow({
    parent: BrowserWindow.fromId(parentId) ?? undefined,
    modal: true,
    title: 'Export...',
    backgroundColor: '#ececec',
    minWidth: 850,
    minHeight: 500,
    width: 850,
    height: 800,
    show: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    },
  })

  enableRemote(exportWindow.webContents)

  return exportWindow
}

