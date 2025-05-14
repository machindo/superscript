import { MutationTree } from 'vuex'

import { renderer } from '../../renderer'

import { DictionaryState } from './types'

export const mutations: MutationTree<DictionaryState> = {
  clearDictionary(state) {
    for (const word of state.words) {
      renderer.ui.$refs.editorPane.unlearnWord(word)
    }

    state.words = []
  },

  addWordsToDictionary(state, words: string[]) {
    const $words = state.words

    for (const word of words) {
      if (!$words.includes(word)) {
        $words.push(word)
      }

      renderer.ui.$refs.editorPane.learnWord(word)
    }

    state.words = $words
  },

  removeWordsFromDictionary(state, words: string[]) {
    const $words = state.words

    for (const word of words) {
      if ($words.includes(word)) {
        $words.splice($words.indexOf(word), 1)
      }

      renderer.ui.$refs.editorPane.unlearnWord(word)
    }

    state.words = $words
  }
}
