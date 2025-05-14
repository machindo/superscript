import { ActionTree } from 'vuex'

import { RootState } from '../types'

import { BehaviorState } from './types'

export const actions: ActionTree<BehaviorState, RootState> = {
  toggleLettererMode({ commit, state }, payload?: boolean) {
    if (payload !== undefined) {
      commit('updateLettererMode', payload)
    } else {
      commit('updateLettererMode', !state.lettererMode)
    }
  }
}
