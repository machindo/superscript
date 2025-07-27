import { ActionTree } from 'vuex'

import { renderer } from '../../renderer'
import { RootState } from '../types'

import { UiState } from './types'

export const actions: ActionTree<UiState, RootState> = {
  showEditor({ commit }) {
    commit('updateView', 'editor')
    renderer.updateMenuItems()
  },
  showLobby({ commit }) {
    commit('updateView', 'lobby')
    renderer.updateMenuItems()
  },

  updateColorTheme({ commit }, payload: 'light-theme' | 'dark-theme') {
    commit('updateColorTheme', payload)
  },

  hideDiffToolbar({ commit }) {
    commit('updateDiffToolbarVisible', false)
  },
  toggleDiffToolbar({ commit, state }, payload?: boolean) {
    if (payload !== undefined) {
      commit('updateDiffToolbarVisible', payload)
    } else {
      commit('updateDiffToolbarVisible', !state.diffToolbarVisible)
    }
  },

  hideFormatToolbar({ commit }) {
    commit('updateFormatToolbarVisible', false)
  },
  toggleFormatToolbar({ commit, state }, payload?: boolean) {
    if (payload !== undefined) {
      commit('updateFormatToolbarVisible', payload)
    } else {
      commit('updateFormatToolbarVisible', !state.formatToolbarVisible)
    }
  },

  showSearchToolbar({ commit }, searchText?: string) {
    if (searchText) {
      commit('updateSearchText', searchText)
    }

    commit('updateSearchToolbarVisible', true)
  },
  hideSearchToolbar({ commit }) {
    commit('updateSearchToolbarVisible', false)
  },

  updateDisplayPageOutline({ commit }, value: boolean) {
    commit('updateDisplayPageOutline', value)
  },

  updateDisplayPanelCount({ commit }, value: boolean) {
    commit('updateDisplayPanelCount', value)
  },

  updateEditorFontFamily({ commit }, value: string) {
    commit('updateEditorFontFamily', value)
  },

  toggleCharacterNumbers({ commit, state }, payload?: boolean) {
    if (payload !== undefined) {
      commit('updateShowCharacterNumbers', payload)
    } else {
      commit('updateShowCharacterNumbers', !state.showCharacterNumbers)
    }
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

    if (payload.spellCheckEnabled !== undefined) {
      commit('updateSpellCheckEnabled', payload.spellCheckEnabled)
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
  },

  showDictionaryToolbar({ commit }, dictionaryTerm?: string) {
    if (dictionaryTerm) {
      commit('updateDictionaryTerm', dictionaryTerm)
    }

    commit('updateDictionaryToolbarVisible', true)
  },

  hideDictionaryToolbar({ commit }) {
    commit('updateDictionaryToolbarVisible', false)
  },
  toggleDictionaryToolbar({ commit, state }) {
    commit('updateDictionaryToolbarVisible', !state.dictionaryToolbarVisible)
  }
}
