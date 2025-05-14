declare module 'vue-moment' {
  import Vue from 'vue'

  class Moment {
    start(): void
  }

  const VueMoment: {
    install(Vue, options)
  }

  export default VueMoment
}
