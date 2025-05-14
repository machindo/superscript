import { Module } from 'vuex'

import { RootState } from '../types'

import { actions } from './actions'
import { mutations } from './mutations'
import { UiState } from './types'

export const state: UiState = {
  colorTheme: 'light-theme'
}

const namespaced = true

export const ui: Module<UiState, RootState> = {
  namespaced,
  state,
  getters: {
    persistentState: state => ({
      colorTheme: state.colorTheme
    })
  },
  mutations,
  actions
}
