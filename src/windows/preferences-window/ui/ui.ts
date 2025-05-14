import Vue from 'vue'
import Component from 'vue-class-component'

import { PreferencesPane } from '../preferences-pane/preferences-pane'

import './ui.styl'
import WithRender from './ui.vue.html'

// @ts-ignore
@WithRender
@Component
export class Ui extends Vue {
  $refs: Vue['$refs'] & {
    preferencesPane: PreferencesPane
  }
}

export const uiComponents = {
  PreferencesPane
}
