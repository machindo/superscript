// istanbul ignore file

import { dialog } from 'electron'
import isDev from 'electron-is-dev'
import console from 'electron-log'
import { autoUpdater } from 'electron-updater'

autoUpdater.logger = console

export function checkForUpdates() {
  if (isDev) return

  autoUpdater.on('update-downloaded', async () => {
    const { response } = await dialog.showMessageBox({
      message: 'An update has been downloaded. Do you want to restart now to finish installing it or install next time you open Superscript?',
      title: 'Update is ready',
      type: 'question',
      buttons: [
        'Restart',
        'Next time'
      ]
    })

    if (response === 0) {
      autoUpdater.quitAndInstall()
    }
  })

  autoUpdater.checkForUpdates()

  autoUpdater.on('error', e => console.error(e))
}
