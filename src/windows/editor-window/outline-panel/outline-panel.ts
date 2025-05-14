import { throttle } from 'lodash-decorators/throttle'
import scrollIntoView from 'scroll-into-view-if-needed'
import Vue from 'vue'
import Component from 'vue-class-component'
import { namespace } from 'vuex-class'
import { StructurePage } from 'windows/editor-window/editor-pane/superscript.structure'
import { Files } from 'windows/editor-window/file/file'
import { renderer } from 'windows/editor-window/renderer'
import { Ui } from 'windows/editor-window/ui/ui'

import { EditorPane } from '../editor-pane/editor-pane'

import './outline-panel.styl'
import WithRender from './outline-panel.vue.html'

const uiModule = namespace('ui')

// @ts-ignore
@WithRender
@Component({
  filters: {
    formatHeadingText(original: string): string {
      return original.replace(/PAGES?\s?|#\s|\./gi, '')
    }
  },
  props: {
    pages: Array
  }
})
export class OutlinePanel extends Vue {
  $parent!: EditorPane
  $refs: Vue['$refs'] & {
    pageOutline: HTMLElement,
    titlePageLink: HTMLAnchorElement
  }
  $root!: Ui

  @uiModule.State('displayPageOutline') visible: boolean
  @uiModule.Action updateDisplayPageOutline: Function

  bookmarks: boolean[] = []
  currentPageCache: number | null = null
  pages: StructurePage[]

  get currentPage(): number | null {
    return this.currentPageCache
  }

  set currentPage(value: number | null) {
    this.currentPageCache = value
    this.scrollCurrentPageLinkIntoView()
  }

  async mounted() {
    this.$store.subscribe(mutation => {
      if (mutation.type === 'ui/updateView' && mutation.payload === 'editor') {
        this.onReady()
      }
    })
  }

  async onReady() {
    const preferences: { bookmarks?: boolean[], scrollTop?: number } = await renderer.file.readData(Files.Preferences)

    if (preferences && preferences.bookmarks) {
      this.bookmarks = preferences.bookmarks
    }

    this.$forceUpdate()
  }

  bookmark(pageNumber: number, event: { target: HTMLButtonElement }) {
    this.bookmarks[pageNumber] = !this.bookmarks[pageNumber]
    this.$forceUpdate()
    renderer.savePreferences()
    event.target.blur()
  }

  @throttle(20)
  scrollCurrentPageLinkIntoView() {
    if (this.currentPage && this.$refs[`page${this.currentPage}Link`]) {
      scrollIntoView((this.$refs[`page${this.currentPage}Link`] as HTMLAnchorElement[])[0], {
        boundary: this.$el,
        block: 'center',
        scrollMode: 'always'
      })
    } else {
      scrollIntoView(this.$refs.titlePageLink, {
        boundary: this.$el,
        block: 'center',
        scrollMode: 'always'
      })
    }
  }

  scrollTo(index: number, event: { target: HTMLButtonElement }) {
    this.$parent.scrollTo(index)
    event.target.blur()
  }

  toggle() {
    this.updateDisplayPageOutline(!this.visible)
  }
}
