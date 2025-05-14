import Delta from 'quill-delta'
import { Module } from 'vuex'

import { RootState } from '../types'

import { ContentState } from './types'

export const state: ContentState = {
  comments: [],
  script: new Delta()
}

const namespaced = true

export const content: Module<ContentState, RootState> = {
  namespaced,
  state
}
