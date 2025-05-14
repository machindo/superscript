import * as remote from '@electron/remote'
import { Debounce } from 'lodash-decorators/debounce'
import { Settings } from 'shared/settings'
import Vue from 'vue'
import Component from 'vue-class-component'

import { BarTab } from '../bar-tab/bar-tab'
import { renderer } from '../renderer'
import { Tab, TabDetails } from '../tab'

import './ui.styl'
import WithRender from './ui.vue.html'

Vue.component('bar-tab', BarTab)

interface TabOptions {
  initialCommand: string
  initialCommandArgument?: any
}

interface TabSettings {
  activeTabIndex: number
  tabs: TabDetails[]
}

// @ts-ignore
@WithRender
@Component
export class Ui extends Vue {
  $refs: Vue['$refs'] & {
    tabViews: HTMLDivElement
  }

  private pActiveTabId = -1
  private pActiveTabIndex = -1

  doStore = false
  isMac = process.platform === 'darwin'
  tabs: Tab[] = []
  initialTabX: number | undefined
  initialTabWidth: number | undefined

  get activeTabId(): number {
    return this.pActiveTabId
  }

  set activeTabId(value: number) {
    for (let i = 0; i < this.tabs.length; i++) {
      if (this.tabs[i].id === value) {
        this.activeTabIndex = i
      }
    }
  }

  get activeTabIndex(): number {
    return this.pActiveTabIndex
  }

  set activeTabIndex(value: number) {
    this.pActiveTabIndex = value

    if (this.activeTab && this.activeTab.webview) {
      this.activeTab.webview.send('focus')
      this.pActiveTabId = this.activeTab.id
    }

    for (let i = 0; i < this.tabs.length; i++) {
      this.tabs[i].webview.classList.toggle('active', i === value)
    }

    this.saveState()
  }

  get activeTab(): Tab {
    return this.tabs[this.activeTabIndex]
  }

  async mounted() {
    // Do not restore tabs from settings if another window is already open
    if (remote.BrowserWindow.getAllWindows().length < 2) {
      const tabSettings = await Settings.get<TabSettings>('tabs')

      if (tabSettings && tabSettings.tabs && tabSettings.tabs.length) {
        for (const tab of tabSettings.tabs) {
          await this.createTab({
            initialCommand: tab.filename ? 'openFile' : 'showLobby',
            initialCommandArgument: tab.filename
          })
        }

        this.activeTabIndex = tabSettings.activeTabIndex < this.tabs.length ? tabSettings.activeTabIndex : this.tabs.length - 1
      }
    }

    this.doStore = true
  }

  send(channel: string, ...args: any[]) {
    if (this.activeTab) {
      this.activeTab.send(channel, ...args)
    }
  }

  sendToAll(channel: string, ...args: any[]) {
    for (const tab of this.tabs) {
      tab.send(channel, ...args)
    }
  }

  async newTab(initialCommand: string, initialCommandArgument?: any): Promise<Tab> {
    let htmlFilename: string
    let view = ''

    switch (initialCommand) {
      case 'preferences':
        htmlFilename = 'preferences'
        view = 'preferences'
        break
      default:
        htmlFilename = 'editor'
    }

    const tab = new Tab(`file:///${__dirname}/${htmlFilename}.html`, initialCommand, initialCommandArgument)
    tab.view = view || tab.view

    await tab.mountWebview(this.$refs.tabViews)

    tab.on('removeTab', () => this.removeTab(tab))
    tab.on('updateFilename', () => this.saveState())
    tab.on('updateView', () => this.saveState())

    return tab
  }

  async createTab(options: TabOptions = { initialCommand: 'showLobby' }) {
    const tab = await this.newTab(options.initialCommand, options.initialCommandArgument)

    tab.initialCommand = options.initialCommand
    tab.initialCommandArgument = options.initialCommandArgument

    tab.webview.send(options.initialCommand, options.initialCommandArgument)
    this.tabs.push(tab)
    this.activeTabIndex = this.tabs.length - 1
    this.saveState()
  }

  @Debounce(500)
  saveState(): Promise<void> {
    if (this.doStore) {
      const tabSettings: TabSettings = {
        activeTabIndex: this.activeTabIndex,
        tabs: []
      }

      for (const tab of this.tabs) {
        if (tab.filename) {
          tabSettings.tabs.push({
            filename: tab.filename,
            title: tab.title,
            view: tab.view
          })
        }
      }

      return Settings.set('tabs', tabSettings)
    }

    return Promise.resolve()
  }

  closeTab(index?: number) {
    index = typeof index === 'number' ? index : this.activeTabIndex

    this.tabs[index].webview.send('close')
  }

  removeTab(tab: Tab) {
    const index = this.tabs.findIndex(t => t.id === tab.id)
    tab.unmount()
    this.tabs.splice(index, 1)

    if (!this.tabs.length) {
      remote.getCurrentWindow().close()
      renderer.forceClose()
    }

    // Force activation of now current tab
    this.activeTabIndex = this.activeTabIndex > this.tabs.length - 1 ? this.tabs.length - 1 : this.activeTabIndex
    tab.emit('removed')
    this.saveState()
  }

  selectNextTab() {
    this.activeTabIndex++

    if (this.activeTabIndex >= this.tabs.length) {
      this.activeTabIndex = 0
    }
  }

  selectPreviousTab() {
    this.activeTabIndex--

    if (this.activeTabIndex < 0) {
      this.activeTabIndex = this.tabs.length - 1
    }
  }

  // Drag and drop
  dragstart(index: number, event: MouseEvent) {
    this.activeTabIndex = index
    this.initialTabX = event.screenX
    this.initialTabWidth = (event.target as HTMLElement).offsetWidth
  }

  drag(index: number, event: MouseEvent) {
    if (this.initialTabX && this.initialTabWidth) {
      this.tabs[index].offset = event.screenX - this.initialTabX

      const steps = Math.round(this.tabs[index].offset / this.initialTabWidth)

      for (let t = 0; t < this.tabs.length; t++) {
        if (t === index) continue

        if (steps > 0 && t > index && t - steps <= index) {
          this.tabs[t].offset = -this.initialTabWidth
        } else if (steps < 0 && t < index && t - steps >= index) {
          this.tabs[t].offset = this.initialTabWidth
        } else {
          this.tabs[t].offset = 0
        }
      }

      this.saveState()
    }
  }

  drop() {
    if (this.initialTabX && this.initialTabWidth) {
      const steps = Math.round(this.activeTab.offset / this.initialTabWidth)

      this.initialTabX = 0

      for (let t = 0; t < this.tabs.length; t++) {
        this.tabs[t].offset = 0
      }

      if (steps) {
        const activeTab = this.activeTab
        const newIndex = steps < 0 ? Math.max(this.activeTabIndex + steps, 0) : Math.min(this.activeTabIndex + steps, this.tabs.length - 1)

        this.tabs.splice(this.activeTabIndex, 1)
        this.tabs.splice(newIndex, 0, activeTab)

        this.activeTabIndex = newIndex
      }
    }
  }

  // Window management
  minimizeWindow() {
    remote.getCurrentWindow().minimize()
  }

  maximizeWindow() {
    remote.getCurrentWindow().isMaximized() ? remote.getCurrentWindow().unmaximize() : remote.getCurrentWindow().maximize()
  }

  closeWindow() {
    remote.getCurrentWindow().close()
  }
}
