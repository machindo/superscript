import * as remote from '@electron/remote'
import { WebviewTag } from 'electron'
import { EventEmitter } from 'events'

export interface TabDetails {
  filename?: string
  title: string
  view: string
}

export class Tab extends EventEmitter implements TabDetails {
  id: number
  dirty = false
  filename?: string
  offset = 0
  title = 'Loading...'
  view = 'lobby'
  webview: WebviewTag

  constructor(public src: string, public initialCommand: string, public initialCommandArgument?: any) {
    super()
    this.id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
  }

  mountWebview(parent: HTMLElement) {
    return new Promise<void>(resolve => {
      this.webview = document.createElement('webview')
      this.webview.classList.add('tab-view')
      this.webview.setAttribute('webpreferences', 'nodeIntegration=true, contextIsolation=false');
      this.webview.setAttribute('nodeintegration', 'nodeintegration')

      // remote.getCurrentWindow() does not work inside webView in Electron v4, so we're passing in the window ID as a workaround
      this.webview.src = `${this.src}?currentWindowId=${remote.getCurrentWindow().id}`

      parent.appendChild(this.webview)

      this.webview.addEventListener('console-message', (event) => {
        console.log('Tab logged a message:', event.message, event)
      })

      this.webview.addEventListener('ipc-message', (event) => {
        switch (event.channel) {
          case 'doneInit':
            resolve()

            if (this.initialCommand) {
              this.webview.send(this.initialCommand, this.initialCommandArgument)
            }

            break
          case 'updateDirty':
            this.dirty = event.args[0]
            break
          case 'updateFilename':
            this.filename = event.args[0]
            break
          case 'updateView':
            this.view = event.args[0]
        }

        this.emit(event.channel, event.args)
      })

      this.webview.addEventListener('page-title-updated', (event) => {
        this.title = event.title
      })
    })
  }

  unmount() {
    this.webview.remove()
  }

  send(channel: string, ...args: any[]) {
    if (this.webview) {
      this.webview.send(channel, ...args)
    }
  }
}
