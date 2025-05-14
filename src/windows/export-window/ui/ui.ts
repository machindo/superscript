import { Settings } from 'shared/settings'
import Vue from 'vue'
import Component from 'vue-class-component'

import { ExportSettings } from '../../superscript.formatting'
import { ExportActions } from '../export-actions/export-actions'
import { ExportPreviewer } from '../export-previewer/export-previewer'
import { ExportSettingsForm } from '../export-settings-form/export-settings-form'

import './ui.styl'
import WithRender from './ui.vue.html'

// @ts-ignore
@WithRender
@Component
export class Ui extends Vue {
  $refs: Vue['$refs'] & {
    exportPreviewer: ExportPreviewer
    exportSettingsForm: ExportSettingsForm
  }

  exportSettings: ExportSettings | null = null
  readyToPrint = false
  readyToPrintPromiseResolve: () => void
  readyToPrintPromise = new Promise(resolve => this.readyToPrintPromiseResolve = resolve)

  async beforeCreate() {
    this.exportSettings = { ...new ExportSettings(), ...await Settings.get<ExportSettings>('exportSettings') }
  }

  setReadyToPrint(isReady: boolean) {
    this.readyToPrint = isReady

    if (isReady) {
      this.readyToPrintPromiseResolve()
    }
  }
}

export const uiComponents = {
  ExportActions,
  ExportPreviewer,
  ExportSettingsForm
}
