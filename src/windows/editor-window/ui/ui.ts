import * as remote from '@electron/remote'
import { Settings } from 'shared/settings'
import Vue from 'vue'
import Component from 'vue-class-component'
import VueMoment from 'vue-moment'
import VueTour, { VTour } from 'vue-tour'
import { namespace, State } from 'vuex-class'
import { SuperscriptComment } from 'windows/superscript.types'

import { DictionaryToolbar } from '../dictionary-toolbar/dictionary-toolbar'
import { DiffToolbar } from '../diff-toolbar/diff-toolbar'
import { EditorPane } from '../editor-pane/editor-pane'
import { FormatToolbar } from '../format-toolbar/format-toolbar'
import { GoToToolbar } from '../go-to-toolbar/go-to-toolbar'
import { LettererToolbar } from '../letterer-toolbar/letterer-toolbar'
import { LobbyPane } from '../lobby-pane/lobby-pane'
import { OutlinePanel } from '../outline-panel/outline-panel'
import { SearchToolbar } from '../search-toolbar/search-toolbar'

import './ui-tour.styl'
import './ui.styl'
import WithRender from './ui.vue.html'

const uiModule = namespace('ui')

Vue.use(VueTour)
Vue.use(VueMoment)

// @ts-ignore
@WithRender
@Component
export class Ui extends Vue {
  $refs: Vue['$refs'] & {
    dictionaryToolbar: DictionaryToolbar,
    diffToolbar: DiffToolbar,
    editorPane: EditorPane,
    formatToolbar: FormatToolbar,
    lettererToolbar: LettererToolbar,
    lobbyPane: LobbyPane,
    newDocumentTour: VTour,
    searchToolbar: SearchToolbar
  }

  comments: SuperscriptComment[] = []
  hideTour = true

  @uiModule.State view: 'editor' | 'lobby' | 'preferences' | null

  newDocumentTourCallbacks = {
    onStop: this.stopTour
  }

  newDocumentTourSteps = [
    {
      target: 'p.frontmatter-true:nth-child(1)',
      header: { title: 'Title' },
      content: 'The first line of your document is always treated as the title.',
      params: { placement: 'left' }
    },
    {
      target: 'p.frontmatter-true:nth-child(2)',
      header: { title: 'By Line' },
      content: 'Set the writer by starting a line with "by ", "written by" or "writer: ".',
      params: { placement: 'left' }
    },
    {
      target: 'h1',
      header: { title: 'Page Heading' },
      content: `A page heading is any line matching "PAGE <i>n</i>", "PAGES <i>n-n</i>" or "<i>n</i> PAGES".<br><br>
        To start a new page, you can just type "page" or a capital "P" on an empty line and hit ENTER.`,
      params: { placement: 'left' }
    },
    {
      target: 'h1 ~ h2',
      header: { title: 'Panel Heading' },
      content: `Panel headings follow the same rules as page headings.<br><br>
        To insert a new panel, you can just type "panel" or a lowercase "p" on an empty line and hit ENTER.`,
      params: { placement: 'left' }
    },
    {
      target: 'h2 + p',
      header: { title: 'Description, Action, etc.' },
      content: 'Panel descriptions don&apos;t have any special syntax or styling.',
      params: { placement: 'left' }
    },
    {
      target: 'h3',
      header: { title: 'Character/dialog Heading' },
      content: 'Character/dialog headings end in a colon (:).',
      params: { placement: 'left' }
    },
    {
      target: 'blockquote',
      header: { title: 'Dialog/captions/SFX' },
      content: 'Any line starting with a tab or 2 spaces. Will be counted as dialog.<br><br>Go to "View" &rarr; "Toggle Dialog Word Count" to see the word count for each page, panel and character heading.',
      params: { placement: 'left' }
    },
    {
      target: 'p.frontmatter-true:nth-child(4)',
      header: { title: 'Frontmatter' },
      content: 'Anything above the first page is frontmatter.<br><br>Press Ctrl+Space on a blank line to see what you can enter.',
      params: { placement: 'left' }
    },
    {
      target: '.page-outline',
      header: { title: 'Document Outline' },
      content: 'Hover over the page outline for quick access to every page of your script.<br><br>Double click on a tab to bookmark it.',
      params: { placement: 'left' }
    }
  ]

  showEditor() {
    this.$refs.editorPane.onReady()
  }

  startTour() {
    // Prevent tour from scrolling down page
    this.$refs.editorPane.$refs.editor.style.paddingBottom = '1em'
    this.$refs.newDocumentTour.$tours['newDocument'].start()
  }

  stopTour() {
    // Re-enable page scrolling
    this.$refs.editorPane.$refs.editor.style.paddingBottom = '90vh'

    if (this.hideTour) {
      Settings.set('hideTour', true)
    }
  }
}

export const uiComponents = {
  DiffToolbar,
  EditorPane,
  FormatToolbar,
  LettererToolbar,
  LobbyPane,
  OutlinePanel,
  GoToToolbar,
  SearchToolbar,
  DictionaryToolbar
}
