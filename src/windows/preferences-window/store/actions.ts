import * as remote from '@electron/remote'
import { ActionTree } from 'vuex'

import { RootState } from './types'

const win = remote.getCurrentWindow()

export const actions: ActionTree<RootState, RootState> = {
  updateAutoUpdate({ commit }, payload: boolean) {
    commit('updateAutoUpdate', payload)
  }
}
