import { Module } from 'vuex'

import { RootState } from '../types'

import { actions } from './actions'
import { mutations } from './mutations'
import { BehaviorState } from './types'

export const state: BehaviorState = {
  editable: true,
  lettererMode: false
}

const namespaced = true

export const behavior: Module<BehaviorState, RootState> = {
  namespaced,
  state,
  mutations,
  actions
}
