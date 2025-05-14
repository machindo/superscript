import * as remote from '@electron/remote'
import { ActionTree } from 'vuex'

import { RootState } from '../types'

import { UiState } from './types'

export const actions: ActionTree<UiState, RootState> = {
  updateAutoHideMenuBar({ commit }, payload: boolean) {
    commit('updateAutoHideMenuBar', payload)
    remote.getCurrentWindow().setAutoHideMenuBar(payload)
    remote.getCurrentWindow().setMenuBarVisibility(!payload)
  },

  updateColorTheme({ commit }, payload: 'light-theme' | 'dark-theme') {
    commit('updateColorTheme', payload)
  },

  updateDisplayPanelCount({ commit }, value: boolean) {
    commit('updateDisplayPanelCount', value)
  },

  updateEditorFontFamily({ commit }, value: string) {
    commit('updateEditorFontFamily', value)
  },

  updateSpellCheckLocale({ commit }, value: string) {
    commit('updateSpellCheckLocale', value)
  },

  updateUISettings({ commit }, payload: any) {
    if (payload.autoHideMenuBar !== undefined) {
      commit('updateAutoHideMenuBar', payload.autoHideMenuBar)
    }

    if (payload.colorTheme !== undefined) {
      commit('updateColorTheme', payload.colorTheme)
    }

    if (payload.displayPanelCount !== undefined) {
      commit('updateDisplayPanelCount', payload.displayPanelCount)
    }

    if (payload.editorFontFamily !== undefined) {
      commit('updateEditorFontFamily', payload.editorFontFamily)
    }

    if (payload.spellCheckLocale !== undefined) {
      commit('updateSpellCheckLocale', payload.spellCheckLocale)
    }
  },

  toggleWordCount({ commit, state }, payload?: boolean) {
    if (payload !== undefined) {
      commit('updateWordCount', payload)
    } else {
      commit('updateWordCount', !state.wordCountSettings.showCount)
    }
  },
  toggleWordCountLimit({ commit, state }, payload?: boolean) {
    if (payload !== undefined) {
      commit('updateWordCountLimit', payload)
    } else {
      commit('updateWordCountLimit', !state.wordCountSettings.showLimit)
    }
  },
  updateWordsPerPage({ commit }, payload: number) {
    commit('updateWordsPerPage', payload)
  },
  updateWordsPerBubble({ commit }, payload: number) {
    commit('updateWordsPerBubble', payload)
  }
}
