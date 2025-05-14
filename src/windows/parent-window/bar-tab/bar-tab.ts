import Vue from 'vue'
import Component from 'vue-class-component'
import { Prop } from 'vue-property-decorator'

import './bar-tab.styl'
import WithRender from './bar-tab.vue.html'

// @ts-ignore
@WithRender
@Component
export class BarTab extends Vue {
  @Prop() dirty: boolean
  @Prop() title: string
  @Prop() offset: number

  close() {
    this.$emit('close')
  }
}
