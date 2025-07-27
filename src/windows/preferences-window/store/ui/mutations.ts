import { MutationTree } from 'vuex'

import { UiState, WordCountSettings } from './types'

export const mutations: MutationTree<UiState> = {
  updateAutoHideMenuBar(state, payload: boolean) {
    state.autoHideMenuBar = payload
  },
  updateColorTheme(state, payload: 'light-theme' | 'dark-theme') {
    state.colorTheme = payload
    document.documentElement.classList.toggle('dark-theme', payload === 'dark-theme')
    document.documentElement.classList.toggle('light-theme', payload === 'light-theme')
  },
  updateDisplayPanelCount(state, payload: boolean) {
    state.displayPanelCount = payload
  },
  updateEditorFontFamily(state, payload: string) {
    state.editorFontFamily = payload
    document.documentElement.style.setProperty('--editor-font-family', payload)
  },
  updateSpellCheckEnabled(state, enable: boolean) {
    state.spellCheckEnabled = enable
  },
  updateSpellCheckLocale(state, payload: string) {
    state.spellCheckLocale = payload
  },
  updateWordCountSettings(state, payload: WordCountSettings) {
    state.wordCountSettings.showCount = payload.showCount
    state.wordCountSettings.showLimit = payload.showLimit
    state.wordCountSettings.page = payload.page
    state.wordCountSettings.bubble = payload.bubble
  },
  updateWordCount(state, payload: boolean) {
    state.wordCountSettings.showCount = payload
  },
  updateWordCountLimit(state, payload: boolean) {
    state.wordCountSettings.showLimit = payload
  },
  updateWordsPerPage(state, payload: number) {
    state.wordCountSettings.page = payload
  },
  updateWordsPerBubble(state, payload: number) {
    state.wordCountSettings.bubble = payload
  }
}
