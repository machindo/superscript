import Vue from 'vue'
import Vuex, { Store, StoreOptions } from 'vuex'
import { settingsPlugin } from 'windows/vuex-plugins'

import { actions } from './actions'
import { dictionary } from './dictionary'
import { mutations } from './mutations'
import { RootState } from './types'
import { ui } from './ui'
import { UiState } from './ui/types'

Vue.use(Vuex)

const store: StoreOptions<RootState> = {
  strict: process.env.NODE_ENV !== 'production',
  state: {
    autoUpdate: false
  },
  mutations,
  actions,
  modules: {
    dictionary,
    ui
  },
  getters: {
    autoUpdate: state => state.autoUpdate
  },
  plugins: [
    settingsPlugin<RootState>({
      filename: 'autoUpdate',
      getter: 'autoUpdate',
      actions: [
        'updateAutoUpdate'
      ],
      updateAction: 'updateAutoUpdate'
    }),
    settingsPlugin<RootState>({
      filename: 'dictionary',
      getter: 'dictionary/persistentState',
      actions: [
        'dictionary/addWordsToDictionary',
        'dictionary/removeWordsFromDictionary'
      ],
      updateAction: 'dictionary/updateDictionarySettings'
    }),
    settingsPlugin<RootState>({
      filename: 'ui',
      getter: 'ui/persistentState',
      actions: [
        'ui/updateAutoHideMenuBar',
        'ui/updateColorTheme',
        'ui/updateDisplayPanelCount',
        'ui/updateEditorFontFamily',
        'ui/updateSpellCheckEnabled',
        'ui/updateSpellCheckLocale'
      ],
      updateAction: 'ui/updateUISettings'
    }),
    settingsPlugin<RootState>({
      filename: 'wordCount',
      getter: 'ui/wordCountSettings',
      mutations: [
        'ui/updateWordCount',
        'ui/updateWordCountLimit',
        'ui/updateWordsPerPage',
        'ui/updateWordsPerBubble'
      ],
      updateMutation: 'ui/updateWordCountSettings'
    })
  ]
}

export default new Store<RootState>(store) as Store<RootState> & {
  readonly state: RootState & {
    ui: UiState
  }
}
