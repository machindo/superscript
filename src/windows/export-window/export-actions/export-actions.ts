import { Settings } from 'shared/settings'
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'
import { renderer } from 'windows/export-window/renderer'

import { ExportFileFormat, ExportSettings } from '../../superscript.formatting'

import { clipboard } from 'electron'
import './export-actions.styl'
import WithRender from './export-actions.vue.html'

// @ts-ignore
@WithRender
@Component
export class ExportActions extends Vue {
  copied = false

  @Prop() exportSettings: ExportSettings
  @Prop() readyToPrint: boolean

  get showPrintButton(): boolean {
    return this.exportSettings.exportFileFormat === ExportFileFormat.Pdf
  }

  get showCopyButton(): boolean {
    return this.exportSettings.exportFileFormat === ExportFileFormat.Markdown || this.exportSettings.exportFileFormat === ExportFileFormat.Text
  }

  cancel() {
    renderer.close()
  }

  copy() {
    clipboard.writeText(renderer.textContents)
    this.copied = true
  }

  @Watch('exportSettings', { deep: true })
  exportSettingsChanged() {
    this.copied = false
  }

  async done() {
    await Settings.set('exportSettings', this.exportSettings)
    renderer.close()
  }

  async print() {
    renderer.win.webContents.print()
  }

  async save() {
    const saved = await renderer.save()

    if (saved) {
      await Settings.set('exportSettings', this.exportSettings)
      renderer.close()
    }
  }
}
