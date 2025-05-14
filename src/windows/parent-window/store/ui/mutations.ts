import { MutationTree } from 'vuex'

import { UiState } from './types'

export const mutations: MutationTree<UiState> = {
  updateColorTheme(state, payload: 'light-theme' | 'dark-theme') {
    state.colorTheme = payload
    document.documentElement.classList.toggle('dark-theme', payload === 'dark-theme')
    document.documentElement.classList.toggle('light-theme', payload === 'light-theme')
  }
}
