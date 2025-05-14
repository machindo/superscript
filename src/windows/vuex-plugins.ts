import { debounce } from 'lodash'
import { Settings } from 'shared/settings'
import { Plugin } from 'vuex'

interface SettingsPluginParams {
  actions?: string[],
  filename: string,
  getter?: string,
  mutations?: string[],
  updateAction?: string,
  updateMutation?: string
}

export function settingsPlugin<S>(params: SettingsPluginParams) {
  const plugin: Plugin<S> = async store => {
    const settings = new Settings(params.filename)
    const initialValues = await settings.get()

    const saveSettings = debounce(() => {
      if (params.getter) {
        settings.set(store.getters[params.getter])
      }
    }, 200)

    if (initialValues) {
      if (params.updateAction) {
        store.dispatch(params.updateAction, initialValues)
      } else if (params.updateMutation) {
        store.commit(params.updateMutation, initialValues)
      }
    }

    if (params.actions) {
      // @ts-ignore
      store.subscribeAction((action) => {
        if (params.actions!.includes(action.type)) {
          saveSettings()
        }
      })
    }

    if (params.mutations) {
      store.subscribe((mutation) => {
        if (params.mutations!.includes(mutation.type)) {
          saveSettings()
        }
      })
    }

    settings.on('change', data => {
      if (params.updateAction) {
        store.dispatch(params.updateAction, data)
      } else if (params.updateMutation) {
        store.commit(params.updateMutation, data)
      }
    })
  }

  return plugin
}
