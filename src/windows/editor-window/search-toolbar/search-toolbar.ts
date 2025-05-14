import escapeStringRegexp from 'escape-string-regexp'
import debounce from 'lodash-decorators/debounce'
import Quill, { DeltaStatic, RangeStatic } from 'quill'
import Delta from 'quill-delta'
import toPlaintext from 'quill-delta-to-plaintext'
import scrollIntoView from 'scroll-into-view-if-needed'
import Vue from 'vue'
import Component from 'vue-class-component'
import { namespace } from 'vuex-class'
import { Ui } from 'windows/editor-window/ui/ui'

import store from '../store'

import WithRender from './search-toolbar.vue.html'

const uiModule = namespace('ui')

// @ts-ignore
@WithRender
@Component
export class SearchToolbar extends Vue {
  $refs: Vue['$refs'] & {
    searchInput: HTMLElement
  }
  $root!: Ui

  editor: Quill
  hasError = false
  scroll: Element
  replacementText: string = ''
  lastIndex = 0
  foundIndex: number | null = null
  foundLength: number | null = null
  selectionIndex: number | null = null
  matchCase = false
  useRegEx = false

  @uiModule.State('searchText') stateSearchText: string
  @uiModule.State('searchToolbarVisible') visible: boolean
  @uiModule.Mutation updateSearchText: Function
  @uiModule.Action hideSearchToolbar: Function

  get searchText(): string {
    return this.stateSearchText
  }

  set searchText(value: string) {
    this.updateSearchText(value)
  }

  clearHighlights() {
    const delta = new Delta().retain(this.editor.getLength(), { highlight: false })
    this.editor.updateContents(delta)
  }

  @debounce(250, { leading: true })
  debouncedFindAll() {
    this.findAll()
  }

  findAll() {
    this.clearHighlights()
    this.hasError = false

    if (this.searchText.length) {
      const delta = new Delta()
      const patternText = this.useRegEx ? this.searchText : escapeStringRegexp(this.searchText)
      const patternFlags = this.matchCase ? 'gm' : 'gim'
      let searchPattern

      try {
        searchPattern = new RegExp(patternText, patternFlags)
      } catch {
        // If user entered an invalid expression with useRegEx === true, just give up
        this.hasError = true
        return
      }

      const text = toPlaintext(this.editor.getContents())

      let match = searchPattern.exec(text)
      let lastIndex = 0

      while (match) {
        delta
          .retain(match.index - lastIndex)
          .retain(match[0].length, { highlight: 'found' })

        // Break out of infinite loops
        if (searchPattern.lastIndex === lastIndex) {
          this.hasError = true
          break
        }

        lastIndex = searchPattern.lastIndex
        match = searchPattern.exec(text)
      }

      this.editor.updateContents(delta)
    }
  }

  findNext() {
    if (!this.searchText) {
      return
    }

    if (!this.useRegEx && /^\d+\.\d*$/.test(this.searchText)) {
      this.goToPageAndPanel()
      return
    }

    const patternText = this.useRegEx ? this.searchText : escapeStringRegexp(this.searchText)
    const patternFlags = this.matchCase ? 'gm' : 'gim'
    const searchPattern = new RegExp(patternText, patternFlags)
    const text = toPlaintext(this.editor.getContents())
    let startFrom = 0

    if (this.foundIndex) {
      startFrom = this.foundIndex + 1
    } else if (this.selectionIndex) {
      startFrom = this.selectionIndex
    }

    let match = searchPattern.exec(text)
    let didMatch = false
    const firstMatch = match

    this.findAll()

    while (match) {
      if (match.index > startFrom) {
        didMatch = true

        this.highlightMatch(match.index, match[0].length)

        break
      }

      match = searchPattern.exec(text)
    }

    // Wrap search to start
    if (!didMatch && firstMatch) {
      this.highlightMatch(firstMatch.index, firstMatch[0].length)
    }
  }

  findPrevious() {
    if (!this.searchText) {
      return
    }

    const patternText = this.useRegEx ? this.searchText : escapeStringRegexp(this.searchText)
    const patternFlags = this.matchCase ? 'gm' : 'gim'
    const searchPattern = new RegExp(patternText, patternFlags)
    const text = toPlaintext(this.editor.getContents())
    let endAt = this.editor.getLength()

    if (this.foundIndex) {
      endAt = this.foundIndex
    } else if (this.selectionIndex) {
      endAt = this.selectionIndex
    }

    let match = searchPattern.exec(text)
    let lastMatch = match

    if (!lastMatch) {
      return
    }

    this.findAll()

    while (match) {
      if (lastMatch.index < endAt && match.index >= endAt) {
        break
      }

      lastMatch = match
      match = searchPattern.exec(text)
      continue
    }

    // Wrap search to end
    if (lastMatch) {
      this.highlightMatch(lastMatch.index, lastMatch[0].length)
    }
  }

  focusSearch() {
    Vue.nextTick(() => {
      this.$refs.searchInput.focus()
    })
  }

  highlightMatch(index: number, length: number) {
    // const { top } = this.editor.getBounds(index, length)
    // const currentScrollTop = this.scroll.scrollTop
    // const scrollHeight = this.scroll.offsetHeight
    const delta = new Delta()
      .retain(index)
      .retain(length, { highlight: 'primary' })

    this.editor.updateContents(delta)
    this.foundIndex = index
    this.foundLength = length

    // Scroll found term into center of view
    // if (top < currentScrollTop || top > currentScrollTop + scrollHeight) {
    //   this.scroll.scrollTop = top - scrollHeight / 2
    // }

    const [line] = this.editor.getLine(index)

    scrollIntoView(line.domNode, {
      boundary: this.scroll,
      block: 'center',
      scrollMode: 'if-needed'
    })
  }

  goToPageAndPanel() {
    const [page, panel] = this.searchText.split('.').map(num => parseInt(num, 10))
    const pageEls: HTMLHeadingElement[] = Array.from(this.scroll.getElementsByTagName('h1'))
    let panelEl: HTMLHeadingElement | null = null

    for (const pageEl of pageEls) {
      const pageNumberMatches = pageEl.innerText.match(/\d+/g)

      if (pageNumberMatches) {
        const pageNumbers = pageNumberMatches.map(num => parseInt(num, 10))

        // If page number matches exactly or is within range
        if (pageNumbers[0] === page || (pageNumbers.length > 1 && pageNumbers[0] <= page && pageNumbers[1] >= page)) {
          if (panel) {
            panelEl = pageEl.nextElementSibling as HTMLHeadingElement | null

            while (panelEl) {
              if (panelEl.tagName === 'H1') {
                panelEl = null
                break
              } else if (panelEl.tagName === 'H2') {
                const panelNumberMatches = panelEl.innerText.match(/\d+/g)

                if (panelNumberMatches) {
                  const panelNumbers = panelNumberMatches.map(num => parseInt(num, 10))

                  // If panel number matches exactly or is within range
                  if (panelNumbers[0] === panel || (panelNumbers.length > 1 && panelNumbers[0] <= panel && panelNumbers[1] >= panel)) {
                    break
                  }
                }
              }

              panelEl = panelEl.nextElementSibling as HTMLHeadingElement | null
            }
          }

          const targetEl = panelEl || pageEl

          // scrollIntoView() won't work unless we scroll somewhere else first
          targetEl.previousElementSibling!.scrollIntoView()
          setTimeout(() => targetEl.scrollIntoView())
          break
        }
      }
    }
  }

  mounted() {
    this.$nextTick(() => {
      this.editor = this.$root.$refs.editorPane.editor
      this.scroll = this.$root.$refs.editorPane.$el

      this.editor.on('text-change', (_delta: DeltaStatic, _oldContents: DeltaStatic, source: string) => {
        if (source === 'user' && this.visible) {
          this.debouncedFindAll()
        }
      })

      this.editor.on('selection-change', (_range: RangeStatic, _oldRange: RangeStatic, source: string) => {
        if (source === 'user') {
          this.reset()
        }
      })

      store.subscribe(mutation => {
        if (mutation.type === 'ui/updateSearchToolbarVisible' && mutation.payload === true) {
          this.focusSearch()
          this.findAll()
        } else if (mutation.type === 'ui/updateSearchText') {
          this.debouncedFindAll()
        }
      })
    })

    window.addEventListener('keyup', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.hide()
      }
    })
  }

  replace() {
    if (!this.searchText) {
      return
    }

    const searchRegEx = this.useRegEx ? new RegExp(this.searchText) : null

    if (this.foundIndex !== null && this.foundLength !== null) {
      const replacementText = searchRegEx ? this.editor.getText(this.foundIndex, this.foundLength).replace(searchRegEx, this.replacementText) : this.replacementText

      const delta = new Delta()
        .retain(this.foundIndex)
        .insert(replacementText)
        .delete(this.foundLength)

      this.editor.updateContents(delta, 'user')
      this.findNext()
    }
  }

  replaceAll() {
    if (!this.searchText) {
      return
    }

    this.clearHighlights()

    if (!this.searchText.length) {
      return
    }

    const delta = new Delta()
    const patternText = this.useRegEx ? this.searchText : escapeStringRegexp(this.searchText)
    const patternFlags = this.matchCase ? 'gm' : 'gim'
    let searchPattern

    try {
      searchPattern = new RegExp(patternText, patternFlags)
    } catch {
      // If user entered an invalid expression with useRegEx === true, just give up
      return
    }

    const text = toPlaintext(this.editor.getContents())

    try {
      let match = searchPattern.exec(text)
      let lastIndex = 0

      while (match) {
        delta
          .retain(match.index - lastIndex)
          .insert(this.replacementText)
          .delete(match[0].length)

        lastIndex = searchPattern.lastIndex
        match = searchPattern.exec(text)
      }

      this.editor.updateContents(delta, 'user')
    } catch (e) {
      console.error(e)
    }
  }

  reset() {
    const selection = this.editor.getSelection()

    this.foundIndex = null
    this.foundLength = null
    this.selectionIndex = selection ? selection.index : this.selectionIndex
  }

  toggleMatchCase() {
    this.matchCase = !this.matchCase
    this.findAll()
  }

  toggleRegEx() {
    this.useRegEx = !this.useRegEx
    this.findAll()
  }

  hide() {
    this.clearHighlights()
    this.hideSearchToolbar()
  }
}
