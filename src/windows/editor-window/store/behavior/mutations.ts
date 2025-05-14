import { MutationTree } from 'vuex'

import { BehaviorState } from './types'

export const mutations: MutationTree<BehaviorState> = {
  updateLettererMode(state, payload) {
    state.lettererMode = payload
  }
}
