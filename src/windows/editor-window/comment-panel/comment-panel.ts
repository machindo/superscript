import autosize from 'autosize'
import debounce from 'lodash-decorators/debounce'
import delay from 'lodash-decorators/delay'
import { DeltaOperation, RangeStatic } from 'quill'
import Delta from 'quill-delta'
import Vue from 'vue'
import Component from 'vue-class-component'
import { EditorPane } from 'windows/editor-window/editor-pane/editor-pane'
import { SuperscriptComment } from 'windows/superscript.types'

import './comment-panel.styl'
import WithRender from './comment-panel.vue.html'

// @ts-ignore
@WithRender
@Component({
  props: {
    comments: Array
  }
})
export class CommentPanel extends Vue {
  $parent!: EditorPane
  $refs: Vue['$refs'] & {
    [commentId: string]: HTMLElement[]
  }

  comments: SuperscriptComment[]
  styleSheet: CSSStyleSheet

  mounted() {
    const style = document.createElement('style')
    document.head.appendChild(style)

    this.styleSheet = style.sheet as CSSStyleSheet
  }

  removeComment(comment: SuperscriptComment) {
    // Remove comment element
    const index = this.comments.indexOf(comment)

    if (index > -1) {
      this.comments.splice(index, 1)
    }

    this.$nextTick(this.setCommentPositions)

    // Find comment highlight
    let highlight = this.findCommentHighlight(comment.id)

    // Loop in case of multiple highlights with the same ID (or skip if no highlights)
    while (highlight.length) {
      const delta = new Delta()
        .retain(highlight.index)
        .retain(highlight.length, { comment: false })

      this.$parent.editor.updateContents(delta)
      highlight = this.findCommentHighlight(comment.id)
    }
  }

  addEntry(comment: SuperscriptComment) {
    comment.entries.push({
      content: ''
    })

    // Update to have the correct element heights when calculating positions
    this.$forceUpdate()
    this.$nextTick(this.setCommentPositions)
  }

  removeEntry(comment: SuperscriptComment, entryIndex: number) {
    comment.entries.splice(entryIndex, 1)

    if (comment.entries.length === 0) {
      this.removeComment(comment)
    } else {
      // Update to have the correct element heights when calculating positions
      this.$forceUpdate()
      this.$nextTick(this.setCommentPositions)
    }
  }

  findCommentHighlight(id: string): RangeStatic {
    const delta = this.$parent.editor.getContents()
    let index = 0
    let length = 0
    let found = false

    delta.forEach(op => {
      if (op.attributes && op.attributes.comment === id) {
        found = true
        length = op.insert.length
      } else if (!found) {
        index += typeof op.insert === 'string' ? op.insert.length : 1
      }
    })

    return { index, length }
  }

  @debounce(20, { leading: true })
  setCommentPositions() {
    if (this.comments) {
      const delta = this.$parent.editor.getContents()
      let index = 0
      let offset = 16 // 1em top padding

      // Reset all comments in case the highlights no longer exist
      for (const comment of this.comments) {
        comment.index = -1
      }

      // Loop through all comment highlights to get updated indices
      delta.forEach((op: DeltaOperation) => {
        if (op.attributes && op.attributes.comment) {
          const comment = this.comments.find((comment: SuperscriptComment) => comment.id === op.attributes!.comment)

          if (comment) {
            comment.index = index
          }
        }

        index += typeof op.insert === 'string' ? op.insert.length : 1
      })

      // Sort comments by index
      this.comments.sort((a, b) => a.index - b.index)

      // Calculate margin-tops in order, with orphans at the top
      for (const comment of this.comments) {
        const commentElement = this.$refs[comment.id] && this.$refs[comment.id][0]

        if (commentElement) {
          let top: number

          if (comment.index === -1) {
            top = 0
            commentElement.style.marginTop = '0'
          } else {
            const blotTop = this.$parent.editor.getBounds(comment.index).top
            top = Math.round(blotTop - offset)
            commentElement.style.marginTop = top > 0 ? `${top}px` : '0'
          }

          offset = commentElement.offsetTop + commentElement.offsetHeight
        }
      }

      this.$forceUpdate()
    }
  }

  @delay(0)
  resizeAll() {
    autosize(this.$el.querySelectorAll('textarea'))
    this.setCommentPositions()
  }

  resize($event: Event) {
    autosize($event.target as Element)
    this.setCommentPositions()
  }

  highlightComment(comment: SuperscriptComment) {
    this.styleSheet.addRule(`[comment='${comment.id}']`, 'background: #ff0;')
  }

  unhighlightComments() {
    while (this.styleSheet.rules.length) {
      this.styleSheet.deleteRule(0)
    }
  }
}
