import Vue from 'vue'
import Vuex, { Store, StoreOptions } from 'vuex'
import { settingsPlugin } from 'windows/vuex-plugins'

import { actions } from './actions'
import { mutations } from './mutations'
import { RootState } from './types'
import { ui } from './ui'
import { UiState } from './ui/types'

Vue.use(Vuex)

const store: StoreOptions<RootState> = {
  strict: process.env.NODE_ENV !== 'production',
  state: {},
  mutations,
  actions,
  modules: {
    ui
  },
  plugins: [
    settingsPlugin<RootState>({
      filename: 'ui',
      updateAction: 'ui/updateUISettings'
    })
  ]
}

export default new Store<RootState>(store) as Store<RootState> & {
  readonly state: RootState & {
    ui: UiState
  }
}
