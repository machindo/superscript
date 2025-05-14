import Vue from 'vue'
import Vuex, { Store, StoreOptions } from 'vuex'
import { settingsPlugin } from 'windows/vuex-plugins'

import { actions } from './actions'
import { behavior } from './behavior'
import { BehaviorState } from './behavior/types'
import { dictionary } from './dictionary'
import { mutations } from './mutations'
import { RootState } from './types'
import { ui } from './ui'
import { UiState } from './ui/types'

Vue.use(Vuex)

const store: StoreOptions<RootState> = {
  strict: process.env.NODE_ENV !== 'production',
  state: {
    dirty: false,
  },
  mutations,
  actions,
  modules: {
    behavior,
    dictionary,
    ui
  },
  plugins: [
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
        'ui/updateColorTheme',
        'ui/updateDisplayPanelCount'
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
    behavior: BehaviorState
    ui: UiState
  }
}
