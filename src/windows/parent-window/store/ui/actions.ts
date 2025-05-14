import { ActionTree } from 'vuex'

import { RootState } from '../types'

import { UiState } from './types'

export const actions: ActionTree<UiState, RootState> = {
  updateColorTheme({ commit }, payload: 'light-theme' | 'dark-theme') {
    commit('updateColorTheme', payload)
  },

  updateUISettings({ commit }, payload: any) {
    if (payload.colorTheme !== undefined) {
      commit('updateColorTheme', payload.colorTheme)
    }
  }
}
