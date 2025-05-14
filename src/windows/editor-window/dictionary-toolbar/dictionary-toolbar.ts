import Axios from 'axios'
import Vue from 'vue'
import Component from 'vue-class-component'
import { namespace } from 'vuex-class'
import { Ui } from 'windows/editor-window/ui/ui'

import './dictionary-toolbar.styl'
import WithRender from './dictionary-toolbar.vue.html'
import { WordResult } from './words-api'

const uiModule = namespace('ui')
const wordsApiEndpoint = 'https://wordsapiv1.p.rapidapi.com/words'
const headers = {
  'x-rapidapi-host': 'wordsapiv1.p.rapidapi.com',
  'x-rapidapi-key': process.env.WORDS_API_KEY
}

// @ts-ignore
@WithRender
@Component({
  filters: {
    camelToWords(input: string): string {
      return input
        .replace(/[A-Z]/g, letter => ` ${letter.toLocaleLowerCase()}`)
        .replace(/^[a-z]/, letter => letter.toLocaleUpperCase())
    },
    listToString(entries: string | string[]): string {
      if (Array.isArray(entries)) {
        return entries && entries.join(', ')
      }

      return entries
    }
  }
})
export class DictionaryToolbar extends Vue {
  $root!: Ui

  @uiModule.State('dictionaryTerm') stateDictionaryTerm: string
  @uiModule.State('dictionaryToolbarVisible') visible: boolean
  @uiModule.Action('hideDictionaryToolbar') hide: Function
  @uiModule.Mutation updateDictionaryTerm: Function

  detail = ''
  foundWord = ''
  readonly maxSearchCount = 50
  results: WordResult[] = []
  searchCount = 0
  searched = false

  get dictionaryTerm(): string {
    return this.stateDictionaryTerm
  }

  set dictionaryTerm(value: string) {
    this.updateDictionaryTerm(value)
  }

  get enabled(): boolean {
    return this.searchCount < this.maxSearchCount && /^[A-Za-zÀ-ÿ\-'\s\d]+$/.test(this.dictionaryTerm)
  }

  mounted() {
    // When user clicks "define" in the context menu, search right away
    // @ts-ignore subscribeAction exists
    this.$store.subscribeAction(async action => {
      if (action.type === 'ui/showDictionaryToolbar' && action.payload && action.payload !== this.dictionaryTerm) {
        await this.$nextTick()
        this.lookUp()
      }
    })
  }

  async lookUp() {
    if (this.enabled) {
      try {
        this.searchCount++

        const { data } = await Axios.get(`${wordsApiEndpoint}/${this.dictionaryTerm.trim()}/${this.detail}`, { headers })

        this.foundWord = data.word

        if (this.detail === 'definitions') {
          this.results = data.definitions
        } else if (this.detail) {
          this.results = [data]
        } else {
          this.results = data.results
        }
      } catch (e) {
        this.foundWord = ''
        this.results = []
      }

      this.searched = true
    }
  }

  reset() {
    this.foundWord = ''
    this.results = []
    this.searched = false
  }
}
