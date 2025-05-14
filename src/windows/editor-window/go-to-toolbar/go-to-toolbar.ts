import Vue from 'vue'
import Component from 'vue-class-component'
import { namespace } from 'vuex-class'
import { Ui } from 'windows/editor-window/ui/ui'

import store from '../store'

import WithRender from './go-to-toolbar.vue.html'

const uiModule = namespace('ui')

// @ts-ignore
@WithRender
@Component
export class GoToToolbar extends Vue {
  $refs: Vue['$refs'] & {
    textInput: HTMLElement
  }
  $root!: Ui

  text = ''
  hasError = false
  scroll: Element

  @uiModule.State('goToToolbarVisible') visible: boolean
  @uiModule.Mutation updateGoToToolbarVisible: Function

  mounted() {
    this.$nextTick(() => {
      this.scroll = this.$root.$refs.editorPane.$el

      store.subscribe(mutation => {
        if (mutation.type === 'ui/updateGoToToolbarVisible' && mutation.payload === true) {
          this.focusInput()
        }
      })
    })

    window.addEventListener('keyup', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.hide()
      }
    })
  }

  go() {
    const [page, panel] = this.text.split('.').map(num => parseInt(num, 10))
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

  focusInput() {
    Vue.nextTick(() => {
      this.$refs.textInput.focus()
    })
  }

  hide() {
    this.updateGoToToolbarVisible(false)
  }
}
