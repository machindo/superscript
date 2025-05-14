import { ActionTree } from 'vuex'

import { RootState } from '../types'

import { DictionaryState } from './types'

export const actions: ActionTree<DictionaryState, RootState> = {
  addWordsToDictionary({ commit }, word: string[]) {
    commit('addWordsToDictionary', word)
  },

  removeWordsFromDictionary({ commit }, word: string[]) {
    commit('removeWordsFromDictionary', word)
  },

  updateDictionarySettings({ commit }, payload: any) {
    if (payload.words) {
      commit('clearDictionary')
      commit('addWordsToDictionary', payload.words)
    }
  }
}
