import { MutationTree } from 'vuex'

import { ContentState } from './types'

export const mutations: MutationTree<ContentState> = {
  updateComments(state, payload) {
    state.comments = payload
  },
  updateScript(state, payload) {
    state.script = payload
  }
}
