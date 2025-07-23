import delay from 'lodash-decorators/delay'
import Quill from 'quill'
import Delta from 'quill-delta'
import Vue from 'vue'
import Component from 'vue-class-component'
import { namespace } from 'vuex-class'
import { renderer } from 'windows/editor-window/renderer'
import { Ui } from 'windows/editor-window/ui/ui'

import './format-toolbar.styl'
import WithRender from './format-toolbar.vue.html'

const uiModule = namespace('ui')

// @ts-ignore
@WithRender
@Component
export class FormatToolbar extends Vue {
  $root!: Ui
  currentStyles: { [property: string]: boolean | string | number } = {}
  editor: Quill

  @uiModule.State('formatToolbarVisible') visible: boolean
  @uiModule.Action('hideFormatToolbar') hide: Function

  @delay(100)
  mounted() {
    this.editor = this.$root.$refs.editorPane.editor
    this.editor.on('selection-change', this.updateCurrentStyles)
    this.editor.on('text-change', this.updateCurrentStyles)
  }

  toggleLetterCase() {
    const selection = this.editor.getSelection()

    if (!selection) return

    const selectedText = this.editor.getText(selection.index, selection.length)
    const uppercase = selectedText.toLocaleUpperCase()
    const lowercase = selectedText.toLocaleLowerCase()

    this.editor.updateContents(new Delta({
      ops: [
        { retain: selection.index },
        { delete: selection.length },
        { insert: selectedText === uppercase ? lowercase : uppercase }
      ]
    }), 'user')
  }

  toggleStyle(style: string) {
    this.editor.format(style, !this.currentStyles[style], 'user')
    this.updateCurrentStyles()
  }

  toggleList(listType: string | boolean) {
    if (this.currentStyles.list === listType) {
      listType = false
    }

    this.editor.format('list', listType, 'user')

    if (!listType) {
      this.editor.format('indent', false, 'user')
    }

    this.updateCurrentStyles()
  }

  indent(indentDelta: number) {
    if (!this.currentStyles.indent && indentDelta < 0) {
      return
    }

    this.editor.format('indent', ((this.currentStyles.indent as number) || 0) + indentDelta, 'user')
    this.updateCurrentStyles()
  }

  updateCurrentStyles() {
    if (this.editor.hasFocus()) {
      this.currentStyles = this.editor.getFormat()
      renderer.updateMenuItems(this.currentStyles)
    }
  }
}
