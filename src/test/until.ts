/* istanbul ignore file */

interface UntilOptions {
  interval?: number
  errorOnTimeout?: boolean
  timeout?: number
}

const defaults = {
  interval: 10,
  errorOnTimeout: true,
  timeout: 500
}

export default function until(condition: Function | number, config: UntilOptions = {}) {
  config = { ...defaults, ...config }

  if (typeof condition === 'function') {
    return new Promise((resolve, reject) => {
      const tester = setInterval(() => {
        if (condition()) {
          resolve()
          clearInterval(tester)
        }
      }, config.interval)

      setTimeout(() => {
        if (config.errorOnTimeout) {
          reject(`Timed out after ${config.timeout} ms. "${condition.toString()}" never true.`)
        } else {
          resolve()
        }
        clearInterval(tester)
      }, config.timeout)
    })
  } else {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve()
      }, condition)
    })
  }
}
