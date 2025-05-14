import { Component, Model, Vue } from 'vue-property-decorator'

import { CharacterDialogPositioning, CharacterHeadingStyle, DialogStyle, ExportFileFormat, ExportSettings, PageHeadingStyle, PageSize, PanelDescriptionPositioning, PanelHeadingStyle, PhysicalPageCount, TitleFormat } from '../../superscript.formatting'

import './export-settings-form.styl'
import WithRender from './export-settings-form.vue.html'

interface FontDescriptor {
  path: string
  postscriptName: string
  family: string
  style: string
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  width: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  italic: boolean
  monospace: boolean
}

// @ts-ignore
@WithRender
@Component
export class ExportSettingsForm extends Vue {
  @Model() exportSettings: ExportSettings

  readonly CharacterDialogPositioning = CharacterDialogPositioning
  readonly CharacterHeadingStyle = CharacterHeadingStyle
  readonly DialogStyle = DialogStyle
  readonly ExportFileFormat = ExportFileFormat
  readonly PageHeadingStyle = PageHeadingStyle
  readonly PanelDescriptionPositioning = PanelDescriptionPositioning
  readonly PanelHeadingStyle = PanelHeadingStyle
  readonly PageSize = PageSize
  readonly PhysicalPageCount = PhysicalPageCount
  readonly TitleFormat = TitleFormat
  readonly defaults = new ExportSettings()

  resetFontSize() {
    this.exportSettings.fontSize = this.defaults.fontSize
  }
}
