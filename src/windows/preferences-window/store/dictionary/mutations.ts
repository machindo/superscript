import { MutationTree } from 'vuex'

import { DictionaryState } from './types'

export const mutations: MutationTree<DictionaryState> = {
  clearDictionary(state) {
    state.words = []
  },

  addWordsToDictionary(state, words: string[]) {
    const $words = state.words

    for (const word of words) {
      if (!$words.includes(word)) {
        $words.push(word)
      }
    }

    state.words = $words
  },

  removeWordsFromDictionary(state, words: string[]) {
    const $words = state.words

    for (const word of words) {
      if ($words.includes(word)) {
        $words.splice($words.indexOf(word), 1)
      }
    }

    state.words = $words
  }
}
