import { Module } from 'vuex'

import { RootState } from '../types'

import { actions } from './actions'
import { mutations } from './mutations'
import { UiState } from './types'

export const state: UiState = {
  autoHideMenuBar: false,
  colorTheme: 'light-theme',
  dictionaryTerm: '',
  dictionaryToolbarVisible: false,
  diffToolbarVisible: false,
  displayPageOutline: true,
  displayPanelCount: false,
  editorFontFamily: 'Courier Prime Sans',
  formatToolbarVisible: false,
  goToText: '',
  goToToolbarVisible: false,
  searchText: '',
  searchToolbarVisible: false,
  showCharacterNumbers: false,
  spellCheckLocale: 'en-US',
  view: null,
  wordCountSettings: {
    showCount: false,
    showLimit: false,
    page: 210,
    bubble: 25
  }
}

const namespaced = true

export const ui: Module<UiState, RootState> = {
  namespaced,
  state,
  getters: {
    persistentState: state => ({
      autoHideMenuBar: state.autoHideMenuBar,
      colorTheme: state.colorTheme,
      displayPageOutline: state.displayPageOutline,
      displayPanelCount: state.displayPanelCount,
      editorFontFamily: state.editorFontFamily,
      spellCheckLocale: state.spellCheckLocale
    }),
    wordCountSettings: state => state.wordCountSettings
  },
  mutations,
  actions
}
