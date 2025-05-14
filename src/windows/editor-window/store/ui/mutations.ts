import { ipcRenderer } from 'electron'
import { MutationTree } from 'vuex'

import { renderer } from '../../renderer'

import { UiState, WordCountSettings } from './types'

export const mutations: MutationTree<UiState> = {
  updateAutoHideMenuBar(state, payload: boolean) {
    state.autoHideMenuBar = payload
  },
  updateView(state, payload: 'editor' | 'lobby') {
    state.view = payload
    ipcRenderer.sendToHost('updateView', payload)
  },
  updateColorTheme(state, payload: 'light-theme' | 'dark-theme') {
    state.colorTheme = payload
    document.documentElement.classList.toggle('dark-theme', payload === 'dark-theme')
    document.documentElement.classList.toggle('light-theme', payload === 'light-theme')
  },
  updateShowCharacterNumbers(state, payload: boolean) {
    state.showCharacterNumbers = payload
  },
  updateDictionaryTerm(state, payload: string) {
    state.dictionaryTerm = payload
  },
  updateDiffToolbarVisible(state, payload: boolean) {
    state.diffToolbarVisible = payload
  },
  updateDisplayPageOutline(state, payload: boolean) {
    state.displayPageOutline = payload
  },
  updateDisplayPanelCount(state, payload: boolean) {
    state.displayPanelCount = payload
  },
  updateEditorFontFamily(state, payload: string) {
    state.editorFontFamily = payload
    document.documentElement.style.setProperty('--editor-font-family', payload)
  },
  updateFormatToolbarVisible(state, payload: boolean) {
    state.formatToolbarVisible = payload
  },
  updateGoToToolbarVisible(state, payload: boolean) {
    state.goToToolbarVisible = payload
  },
  updateSearchText(state, payload: string) {
    state.searchText = payload
  },
  updateSearchToolbarVisible(state, payload: boolean) {
    state.searchToolbarVisible = payload
  },
  updateSpellCheckLocale(state, locale: string) {
    state.spellCheckLocale = locale
    // Try to wait for renderer.win to be available
    setTimeout(() => renderer?.win?.webContents.session.setSpellCheckerLanguages([locale]), 500)
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
  },
  updateDictionaryToolbarVisible(state, payload: boolean) {
    state.dictionaryToolbarVisible = payload
  }
}
