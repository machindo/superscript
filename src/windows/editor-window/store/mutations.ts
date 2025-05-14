import { MutationTree } from 'vuex'

import { RootState } from './types'

export const mutations: MutationTree<RootState> = {
  updateDirty(state, payload) {
    state.dirty = payload
  },
}
