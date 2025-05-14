declare module 'vue-tour' {
  import Vue from 'vue'

  class Tour {
    start(): void
  }

  export class VTour extends Vue {
    $tours: {
      [name: string]: Tour
    }

    name: string
  }

  export class VStep extends Vue {
    name: string
  }

  const VueTour: {
    install(Vue, options)
  }

  export default VueTour
}
