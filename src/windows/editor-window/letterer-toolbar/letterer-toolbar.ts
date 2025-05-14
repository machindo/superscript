import delay from 'lodash-decorators/delay'
import Vue from 'vue'
import Component from 'vue-class-component'
import { namespace } from 'vuex-class'
import { Ui } from 'windows/editor-window/ui/ui'

import { EditorPane } from '../editor-pane/editor-pane'

import './letterer-toolbar.styl'
import WithRender from './letterer-toolbar.vue.html'

const behaviorModule = namespace('behavior')

// @ts-ignore
@WithRender
@Component
export class LettererToolbar extends Vue {
  $root!: Ui
  editorPane: EditorPane | null = null

  @behaviorModule.State lettererMode: boolean | string
  @behaviorModule.Action toggleLettererMode: Function

  get isMac(): boolean {
    return process.platform === 'darwin'
  }

  @delay(100)
  mounted() {
    this.editorPane = this.$root.$refs.editorPane
  }

  toggleCopyMode() {
    this.toggleLettererMode(this.lettererMode === 'i' ? true : 'i')
  }

  selectNext() {
    this.editorPane && this.editorPane.selectNextDialogBlock()
  }

  selectPrevious() {
    this.editorPane && this.editorPane.selectPreviousDialogBlock()
  }
}
