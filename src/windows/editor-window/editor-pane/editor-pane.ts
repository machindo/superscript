import * as remote from '@electron/remote'
import { clipboard, ipcRenderer, shell } from 'electron'
import console from 'electron-log'
import debounce from 'lodash-decorators/debounce'
import throttle from 'lodash-decorators/throttle'
import Quill, { DeltaOperation, DeltaStatic, RangeStatic } from 'quill'
import Delta from 'quill-delta'
import 'quill/dist/quill.core.css'
import scrollIntoView from 'scroll-into-view-if-needed'
import Vue from 'vue'
import Component from 'vue-class-component'
import { Action, namespace, State } from 'vuex-class'
import { CommentPanel } from 'windows/editor-window/comment-panel/comment-panel'
import { ContextMenu } from 'windows/editor-window/context-menu'
import { Files } from 'windows/editor-window/file/file'
import { FloatingMenu } from 'windows/editor-window/floating-menu/floating-menu'
import { OutlinePanel } from 'windows/editor-window/outline-panel/outline-panel'
import { renderer } from 'windows/editor-window/renderer'
import { Ui } from 'windows/editor-window/ui/ui'
import { Superscript } from 'windows/superscript'
import { SuperscriptComment } from 'windows/superscript.types'

import { WordCountSettings } from '../store/ui/types'

import { ClipboardScrollFix } from './clipboard'
import './editor-pane.styl'
import WithRender from './editor-pane.vue.html'
import { SuperscriptAsYouType } from './superscript.quill'
import { StructurePage } from './superscript.structure'

// Configure logger
console.transports.file.level = process.env.NODE_ENV === 'development' ? 'verbose' : 'warn'
console.transports.console.level = process.env.NODE_ENV === 'development' ? 'verbose' : false

const behaviorModule = namespace('behavior')
const dictionaryModule = namespace('dictionary')
const uiModule = namespace('ui')

Vue.component('comment-panel', CommentPanel)
Vue.component('floating-menu', FloatingMenu)
Vue.component('outline-panel', OutlinePanel)
Quill.register('modules/superscript', SuperscriptAsYouType)
Quill.register('modules/clipboard', ClipboardScrollFix, true)

// Override Quill's sanitizer to allow file URLs
const Image = Quill.import('formats/image')
Image.sanitize = function (url: string) {
  return url
}

const SCROLL_OFFSET = 50

// @ts-ignore
@WithRender
@Component({
  props: {
    comments: Array
  }
})
export class EditorPane extends Vue {
  $refs: Vue['$refs'] & {
    commentPanel: CommentPanel,
    editor: HTMLDivElement,
    floatingMenu: FloatingMenu,
    outlinePanel: OutlinePanel
  }
  $root!: Ui

  comments: SuperscriptComment[]
  contextMenu: ContextMenu
  editor: Quill
  currentCursorTop = 0
  currentCursorHeight = 0
  currentDialogBlock: HTMLQuoteElement | null = null
  currentOffsetHeight = 0
  currentScrollTop = 0
  currentSpellCheckLocale = 'en-US'
  learnedWords: string[] = []
  pages: StructurePage[] = []
  previousElementCount = 0
  scriptLocale = ''

  @State dirty: boolean
  @Action updateDirty: Function

  @behaviorModule.State lettererMode: boolean | string

  @dictionaryModule.State('words') customDictionaryWords: string[]
  @dictionaryModule.Action addWordsToDictionary: (words: string[]) => void
  @dictionaryModule.Action removeWordsFromDictionary: (words: string[]) => void

  @uiModule.State displayPanelCount: boolean
  @uiModule.State showCharacterNumbers: boolean
  @uiModule.State spellCheckEnabled: boolean
  @uiModule.State spellCheckLocale: string
  @uiModule.State wordCountSettings: WordCountSettings
  @uiModule.Action showDictionaryToolbar: Function

  async mounted() {
    this.editor = new Quill(this.$refs.editor, {
      formats: [
        // Inline
        'bold',
        'italic',
        'link',
        'strike',
        'underline',
        // Block
        'blockquote',
        'header',
        'indent',
        'list',
        'direction',
        // Embeds
        'image',
        // Superscript
        'comment',
        'highlight',
        'frontmatter',
        'offpage',
        'panelCount',
        'spellcheck',
        'wordCount'
      ],
      modules: {
        clipboard: {
          matchVisual: false
        },
        history: {
          delay: 2000,
          maxStack: 500,
          userOnly: true
        },
        keyboard: {
          // Overwrite default bindings to show appropriate indicators
          bindings: {
            bold: {
              key: 'B',
              shortKey: true,
              handler() {
                renderer.ui.$refs.formatToolbar.toggleStyle('bold')
              }
            },
            toggleLetterCase: {
              key: 'K',
              shortKey: true,
              handler() {
                renderer.ui.$refs.formatToolbar.toggleLetterCase()
              }
            },
            italic: {
              key: 'I',
              shortKey: true,
              handler() {
                renderer.ui.$refs.formatToolbar.toggleStyle('italic')
              }
            },
            underline: {
              key: 'U',
              shortKey: true,
              handler() {
                renderer.ui.$refs.formatToolbar.toggleStyle('underline')
              }
            }
          }
        },
        superscript: true
      },
      placeholder: '',
      theme: undefined
    })

    const superscriptModule: SuperscriptAsYouType = this.editor.getModule('superscript')
    superscriptModule.setFloatingMenu(this.$refs.floatingMenu)

    if (!renderer.editable) {
      this.editor.disable()
    }

    this.editor.on('selection-change', (range) => this.onSelectionChange(range))

    this.$el.addEventListener('scroll', () => this.onScroll(), { passive: true })

    window.addEventListener('beforeunload', () => {
      // Unlearn all saved words
      for (const word of this.learnedWords) {
        if (word.length) {
          this.unlearnWord(word)
        }
      }
    })

    this.contextMenu = new ContextMenu(this)

    this.$store.subscribe(mutation => {
      if (mutation.type === 'behavior/updateLettererMode') {
        if (mutation.payload) {
          this.editor.disable()
          this.registerGlobalShortcuts()
        } else {
          this.unregisterGlobalShortcuts()
          this.deselectAllDialogBlocks()
          this.editor.enable()
        }
      } else if (mutation.type === 'ui/updateView') {
        if (mutation.payload === 'editor') {
          this.onReady()
        }
      }
    })
  }

  async onReady() {
    setTimeout(() => {
      const superscriptModule: SuperscriptAsYouType = this.editor.getModule('superscript')

      this.pages = superscriptModule.structure.pages
      this.editor.getModule('clipboard').scroller = this.$el
      this.editor.on('text-change', () => this.onTextChange(superscriptModule))

      this.addLastLineClass().then(() => this.onScroll())

      this.$refs.commentPanel.resizeAll()

      this.getLocaleAndWordsFromFrontmatter(superscriptModule, { forceRefresh: true })
    }, 100)

    const preferences: { bookmarks?: boolean[], scrollTop?: number } = await renderer.file.readData(Files.Preferences)

    if (preferences && preferences.scrollTop !== undefined) {
      this.currentScrollTop = preferences.scrollTop
      this.$el.scrollTop = preferences.scrollTop
    }

    this.$forceUpdate()
  }

  @debounce(100)
  getLocaleAndWordsFromFrontmatter(superscriptModule: SuperscriptAsYouType, { forceRefresh } = { forceRefresh: false }) {
    const frontmatter = superscriptModule.splitFrontmatter().text
    const attributes = Superscript.parseFrontmatter(frontmatter)
    // Concat characters and vocabulary, split all words by whitespace
    const words = [...attributes.$characters, ...attributes.$vocabulary]
      .map(w => w.split(/\s+/m))
      .reduce((acc, val) => acc.concat(val), [])

    const newWords = words.filter(x => !this.learnedWords.includes(x))
    const oldWords = this.learnedWords.filter(x => !words.includes(x))

    this.learnedWords = words

    // Unlearn removed words
    for (const word of oldWords) {
      if (word.length) {
        this.unlearnWord(word)
      }
    }

    // Learn new words
    for (const word of newWords) {
      if (word.length) {
        this.learnWord(word)
      }
    }

    this.scriptLocale = attributes.language as string

    this.updateSpellCheckLanguage()

    if (forceRefresh) {
      this.relearnWords()
    }
  }

  registerGlobalShortcuts() {
    remote.globalShortcut.register('CommandOrControl+Shift+C', this.selectNextDialogBlock)
    remote.globalShortcut.register('CommandOrControl+Shift+V', () => {
      this.selectCurrentDialogBlock()

      setTimeout(async () => {
        await ipcRenderer.invoke('tapPasteKeys')
        setTimeout(() => this.selectNextDialogBlock(), 100)
      }, 250)
    })
  }

  unregisterGlobalShortcuts() {
    remote.globalShortcut.unregister('CommandOrControl+Shift+C')
    remote.globalShortcut.unregister('CommandOrControl+Shift+V')
  }

  @throttle(100)
  onScroll() {
    // Window resize fix
    // Normally, resizing the window scrolls the editor to the top. Here, we prevent that.
    if (this.currentOffsetHeight !== (this.$el as HTMLElement).offsetHeight) {
      this.$el.scrollTop = this.currentScrollTop
      this.currentOffsetHeight = (this.$el as HTMLElement).offsetHeight
      return
    } else {
      this.currentScrollTop = this.$el.scrollTop
      this.currentOffsetHeight = (this.$el as HTMLElement).offsetHeight
    }
    // End window resize fix

    // Highlight current page in page outline
    let currentPage = 0

    for (const page of this.pages) {
      if (this.$el.scrollTop >= page.scrollTop - SCROLL_OFFSET * 1.5) {
        currentPage = page.number
      } else {
        break
      }
    }

    this.$refs.outlinePanel.currentPage = currentPage

    // Save current scroll position
    renderer.savePreferences()
  }

  @throttle(100)
  onSelectionChange(range: RangeStatic) {
    if (range) {
      const { top, height } = this.editor.getBounds(range.index, range.length)
      this.currentCursorTop = top
      this.currentCursorHeight = height
    }
  }

  @debounce(100)
  onTextChange(superscriptModule: SuperscriptAsYouType) {
    this.addLastLineClass()

    this.getLocaleAndWordsFromFrontmatter(superscriptModule)

    // Save document structure
    this.pages = superscriptModule.structure.pages

    this.updateDirty(true)

    // Calculate comment positions
    this.$refs.commentPanel.setCommentPositions()

    renderer.autosave()
  }

  async addLastLineClass() {
    const elements = Array.from(this.editor.root.children)

    if (this.previousElementCount !== elements.length) {
      this.previousElementCount = elements.length

      for (const element of elements) {
        // Apply .last-line-of-page if on a page, and if the following element is an H1 or if this is the last element in the document
        !element.nextElementSibling || element.nextElementSibling.tagName === 'H1' // || element.nextElementSibling.classList.contains('offpage-true')
          ? element.classList.add('last-line-of-page')
          : element.classList.remove('last-line-of-page')
      }
    }
  }

  /**
   * Follow links on cmd/ctrl click
   */
  onClick($event: MouseEvent) {
    const target = $event.target as HTMLAnchorElement

    // If link is clicked with ... cmd pressed on Mac or ctrl pressed on Windows or Linux
    if (target.href && cmdOrCtrl($event)) {
      shell.openExternal(target.href)
    }

    if (this.lettererMode) {
      const blockquote: HTMLQuoteElement | null = target.closest('blockquote')
      this.selectDialogBlock(blockquote)
    }
  }

  selectDialogBlock(blockquote: HTMLQuoteElement | null) {
    if (blockquote && blockquote.textContent) {
      this.currentDialogBlock = blockquote

      const blockquotes = this.$el.querySelectorAll('blockquote.selected')

      for (const blockquote of Array.from(blockquotes)) {
        blockquote.classList.remove('selected')
      }

      blockquote.classList.add('selected')

      let html = blockquote.innerHTML.trim()
      let text = blockquote.textContent.trim()
      let rtf = '{\\rtf1\\ansi '
        + html
          .replace(/<strong>/g, '{\\b ')
          .replace(/<em>/g, '{\\i ')
          .replace(/<u>/g, '{\\ul ')
          .replace(/<s>/g, '{\\strike ')
          .replace(/<\/(?:strong|em|u|s)>/g, '}')
        + '}'

      // Replace lone i's with capital I's and all others to lowercase
      // But preserve {\\i in RTF
      if (this.lettererMode === 'i') {
        html = html.replace(/I/g, 'i').replace(/\bi\b/gi, 'I')
        rtf = rtf.replace(/I/g, 'i').replace(/\bi\b/gi, 'I').replace(/\\I/g, '\\i')
        text = text.replace(/I/g, 'i').replace(/\bi\b/gi, 'I')
      }

      clipboard.write({ html, rtf, text })

      scrollIntoView(blockquote, {
        boundary: this.$el,
        behavior: 'smooth',
        block: 'center',
        scrollMode: 'if-needed'
      })
    }
  }

  /**
   * Select current dialog block, for copying a block that's already selected
   */
  selectCurrentDialogBlock() {
    if (this.currentDialogBlock) {
      this.selectDialogBlock(this.currentDialogBlock)
    }
  }

  selectNextDialogBlock() {
    let element = this.currentDialogBlock?.nextElementSibling

    while (element) {
      element = element.nextElementSibling

      if (!element) {
        this.deselectAllDialogBlocks()
        clipboard.clear()
        break
      } else if (element.tagName === 'BLOCKQUOTE') {
        this.selectDialogBlock(element as HTMLQuoteElement)
        break
      }
    }
  }

  selectPreviousDialogBlock() {
    if (this.currentDialogBlock) {
      let element = this.currentDialogBlock.previousElementSibling

      while (element && element.tagName !== 'BLOCKQUOTE') {
        element = element.previousElementSibling
      }

      if (element) {
        this.selectDialogBlock(element as HTMLQuoteElement)
      }
    }
  }

  deselectAllDialogBlocks() {
    this.currentDialogBlock = null

    const blockquotes = this.$el.querySelectorAll('blockquote')

    for (const b in blockquotes) {
      if (blockquotes[b].style) {
        blockquotes[b].style.removeProperty('background')
      }
    }

    const selectedBlockquotes = this.$el.querySelectorAll('blockquote.selected')

    for (const blockquote of Array.from(selectedBlockquotes)) {
      blockquote.classList.remove('selected')
    }
  }

  /**
   * Show autocomplete menu
   */
  showFloatingMenu() {
    this.$refs.floatingMenu.show()
  }

  onKeyDown() {
    this.addLastLineClass()
  }

  /**
   * Traverse the floating menu, if it is shown
   */
  onDownArrow($event: KeyboardEvent) {
    if (this.$refs.floatingMenu.isShown) {
      $event.preventDefault()
      this.$refs.floatingMenu.hoverNext()
    }
  }

  /**
   * Traverse the floating menu, if it is shown
   */
  onUpArrow($event: KeyboardEvent) {
    if (this.$refs.floatingMenu.isShown) {
      $event.preventDefault()
      this.$refs.floatingMenu.hoverPrevious()
    }
  }

  /**
   * Click currently hovered item in floating menu, if it is shown
   */
  onEnter($event: KeyboardEvent) {
    if (this.$refs.floatingMenu.isShown && this.$refs.floatingMenu.items[this.$refs.floatingMenu.hoveredIndex]) {
      const index = this.$refs.floatingMenu.hoveredIndex

      $event.preventDefault()
      $event.stopImmediatePropagation()

      this.$refs.floatingMenu.click(index)
    }
  }

  /**
   * Close floating menu
   */
  onEsc($event: KeyboardEvent) {
    if (this.$refs.floatingMenu.isShown) {
      $event.preventDefault()
      this.$refs.floatingMenu.hide()
    }
  }

  onMousemove($event: MouseEvent) {
    const target = $event.target as HTMLAnchorElement

    if (target.href) {
      // Add class if ... cmd pressed on Mac or ctrl pressed on Windows or Linux
      target.classList.toggle('ctrl-pressed', ((process.platform === 'darwin' && $event.metaKey) || (process.platform !== 'darwin' && $event.ctrlKey)))
    }
  }

  updateSpellCheckLanguage() {
    if (this.scriptLocale && this.currentSpellCheckLocale !== this.scriptLocale) {
      renderer.webContents.session.setSpellCheckerLanguages([this.scriptLocale])
      this.relearnWords()
    } else if (this.currentSpellCheckLocale !== this.spellCheckLocale) {
      renderer.webContents.session.setSpellCheckerLanguages([this.spellCheckLocale])
      this.relearnWords()
    }
  }

  // Create comment/note
  createComment() {
    const id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36)
    const selection = this.editor.getSelection()

    if (!selection) {
      return
    }

    if (selection.length < 1) {
      selection.length = 1
    }

    let selectedText = this.editor.getText(selection.index, selection.length)

    // If creating a comment at the end of a line, or on a blank line, select the previous character
    while (/^\n+$/.test(selectedText) && selection.index > 0) {
      selection.index--
      selectedText = this.editor.getText(selection.index, selection.length)
    }

    selectedText = selectedText.trim()

    this.comments.push({
      id,
      entries: [{
        content: selectedText.length ? `"${selectedText}"` : ''
      }],
      index: selection.index
    })

    this.editor.formatText(selection.index, selection.length || 1, 'comment', id)

    this.$refs.commentPanel.resizeAll()
    this.$refs.commentPanel.$forceUpdate()
  }

  scrollTo(index: number) {
    const { top } = this.editor.getBounds(index)
    this.$el.scrollTop = top - SCROLL_OFFSET
  }

  setContents(contents: DeltaStatic | { ops: DeltaOperation[] }, source?: 'api' | 'silent' | 'user') {
    const delta = new Delta(contents.ops)
    this.editor.setContents(delta, source)
    this.editor.getModule('history').clear()
    this.$refs.commentPanel.setCommentPositions()
  }

  disable() {
    this.editor.disable()
  }

  enable() {
    this.editor.enable()
  }

  relearnWords() {
    for (const word of [...this.learnedWords, ...this.customDictionaryWords]) {
      this.learnWord(word)
    }
  }

  learnWord(word: string) {
    renderer.webContents.session.addWordToSpellCheckerDictionary(word)
  }

  unlearnWord(word: string) {
    renderer.webContents.session.removeWordFromSpellCheckerDictionary(word)
  }
}

function cmdOrCtrl(event: KeyboardEvent | MouseEvent): boolean {
  return (process.platform === 'darwin' && event.metaKey) || (process.platform !== 'darwin' && event.ctrlKey)
}
