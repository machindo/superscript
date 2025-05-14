import Vue from 'vue'
import Component from 'vue-class-component'
import { EditorPane } from 'windows/editor-window/editor-pane/editor-pane'

import './floating-menu.styl'
import WithRender from './floating-menu.vue.html'

interface MenuItem {
  label: string
  bold?: boolean
  click: () => void
}

// @ts-ignore
@WithRender
@Component
export class FloatingMenu extends Vue {
  $parent!: EditorPane

  hoveredIndex = 0
  items: MenuItem[] = []
  position = {
    top: 0,
    left: 0
  }
  isShown = false

  /**
   * @param index Which menu item to click
   * @param deleteNextChar Whether to delete the next character (if click is triggered by ENTER or TAB)
   */
  click(index: number) {
    if (!this.items[index]) {
      return
    }

    const scrollTop = this.$parent.$el.scrollTop
    this.items[index].click()
    this.$parent.$el.scrollTop = scrollTop
    this.$parent.editor.focus()
    this.hide()
  }

  hoverNext() {
    if (this.hoveredIndex === this.items.length - 1) {
      this.hoveredIndex = -1
    } else {
      this.hoveredIndex++
    }
  }

  hoverPrevious() {
    if (this.hoveredIndex < 0) {
      this.hoveredIndex = this.items.length - 1
    } else {
      this.hoveredIndex--
    }
  }

  reset() {
    this.hide()

    while (this.items.length) {
      this.items.pop()
    }
  }

  show() {
    this.isShown = true
  }

  hide() {
    this.hoveredIndex = -1
    this.isShown = false
  }

  toggle() {
    this.isShown = !this.isShown

    if (!this.isShown) {
      this.hoveredIndex = -1
    }
  }
}
