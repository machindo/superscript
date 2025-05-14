import { MutationTree } from 'vuex'

import { RootState } from './types'

export const mutations: MutationTree<RootState> = {
  updateAutoUpdate(state, payload: boolean) {
    state.autoUpdate = payload
  }
}
