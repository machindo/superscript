import { Module } from 'vuex'

import { RootState } from '../types'

import { actions } from './actions'
import { mutations } from './mutations'
import { DictionaryState } from './types'

export const state: DictionaryState = {
  words: []
}

const namespaced = true

export const dictionary: Module<DictionaryState, RootState> = {
  namespaced,
  state,
  getters: {
    persistentState: state => ({ words: state.words })
  },
  mutations,
  actions
}
