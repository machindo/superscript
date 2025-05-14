import * as remote from '@electron/remote'
import { Settings } from 'shared/settings'
import Vue from 'vue'
import Component from 'vue-class-component'
import { renderer } from 'windows/editor-window/renderer'

import './lobby-pane.styl'
import WithRender from './lobby-pane.vue.html'

// @ts-ignore
@WithRender
@Component
export class LobbyPane extends Vue {
  recentFiles: string[] = []
  version: string = ''

  mounted() {
    this.populateRecentFiles()
    this.version = remote.app.getVersion()
  }

  async openFile(filename?: string) {
    if (filename) {
      const success = await renderer.openFile(filename)

      if (!success) {
        this.populateRecentFiles()
      }
    } else {
      renderer.newFile()
    }
  }

  async populateRecentFiles() {
    if (await Settings.has('recentFiles')) {
      this.recentFiles = await Settings.get<string[]>('recentFiles', [])
    }
  }

  showOpenFileDialog() {
    renderer.showOpenFileDialog()
  }
}
