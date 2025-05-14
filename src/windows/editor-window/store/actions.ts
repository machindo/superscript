import { ipcRenderer } from 'electron'
import { ActionTree } from 'vuex'

import { renderer } from '../renderer'

import { RootState } from './types'

export const actions: ActionTree<RootState, RootState> = {
  updateDirty({ commit }, payload: boolean) {
    commit('updateDirty', payload)
    ipcRenderer.sendToHost('updateDirty', payload)
    renderer.win.setDocumentEdited(payload)
  }
}
