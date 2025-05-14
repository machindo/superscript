import delay from 'lodash-decorators/delay'
import Quill, { DeltaStatic } from 'quill'
import Delta from 'quill-delta'
import Vue from 'vue'
import Component from 'vue-class-component'
import { namespace } from 'vuex-class'
import { renderer } from 'windows/editor-window/renderer'
import { Ui } from 'windows/editor-window/ui/ui'

import './diff-toolbar.styl'
import WithRender from './diff-toolbar.vue.html'

const uiModule = namespace('ui')

// @ts-ignore
@WithRender
@Component
export class DiffToolbar extends Vue {
  $root!: Ui
  contents: DeltaStatic
  editor: Quill
  filename: string = ''

  @uiModule.State('diffToolbarVisible') visible: boolean
  @uiModule.Action('hideDiffToolbar') hide: Function

  @delay(500)
  mounted() {
    this.editor = this.$root.$refs.editorPane.editor
  }

  compare(filename: string, delta: DeltaStatic) {
    this.filename = filename
    this.editor.disable()
    renderer.editable = false
    this.contents = this.editor.getContents()

    const otherDelta = new Delta(delta.ops)
    const diff = otherDelta.diff(this.contents)
    const reverseDiff = this.contents.diff(otherDelta)
    const deletions: string[] = []

    for (const op of reverseDiff.ops!) {
      if (op.insert) {
        deletions.push(op.insert)
      }
    }

    let index = 0

    for (const op of diff.ops!) {
      if (op.delete) {
        const deletion = deletions.shift()!
        this.editor.insertText(index, deletion, { background: 'red', title: '' }, 'api')
        index += deletion.length
      } else if (op.insert) {
        this.editor.formatText(index, op.insert.length, { background: 'lightgreen' }, 'api')
        index += op.insert.length
      } else if (op.retain) {
        index += op.retain
      }
    }

    renderer.updateMenuItems()
  }

  selectFile() {
    renderer.compareFile()
  }

  reset() {
    this.filename = ''
    this.editor.setContents(this.contents)
    this.editor.enable()
    renderer.editable = true
    renderer.updateMenuItems()
  }
}
