import chokidar, { FSWatcher } from 'chokidar'
import { EventEmitter } from 'events'
import fs from 'fs-extra'
import path from 'path'

const getAppPath = () => import('electron')
  .then(({ app }) => app ?? import('@electron/remote').then(({ app }) => app))
  .then((app) => app.getPath('userData'))

function wait(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

let dir = ''

getAppPath().then(appPath => dir = path.join(appPath, 'user-settings'))

export class Settings<T = any> extends EventEmitter {
  static get dir() {
    return dir
  }

  private static instances: Settings[] = []

  readonly filepath: string
  readonly watcher: FSWatcher

  constructor(filepath: string) {
    super()
    this.filepath = filepath
    this.watcher = chokidar.watch(path.join(Settings.dir, `${filepath}.json`))

    this.watcher.on('add', async () => {
      await wait(100)
      const newValue = await this.get()
      this.emit('add', newValue)
    })

    this.watcher.on('change', async () => {
      await wait(100)
      const newValue = await this.get()
      this.emit('change', newValue)
    })

    this.watcher.on('unlink', () => {
      this.emit('unlink', null)
    })

    Settings.instances.push(this)
  }

  static async get<T = any>(filepath: string, fallback: T = {} as T): Promise<T> {
    if (!await Settings.has(filepath)) {
      return fallback
    }

    // Try to read JSON
    try {
      const text = await fs.readFile(path.join(Settings.dir, `${filepath}.json`), 'utf8')
      return JSON.parse(text)
    } catch (e) /* istanbul ignore next */ {
      console.error(`Error trying to read ${filepath}.json`, e)
      return fallback
    }
  }

  static has(filepath: string): Promise<boolean> {
    return fs.pathExists(path.join(Settings.dir, `${filepath}.json`))
  }

  static set(filepath: string, data: any): Promise<void> {
    return fs.outputJson(path.join(Settings.dir, `${filepath}.json`), data)
  }

  static unwatchAll() {
    for (const instance of Settings.instances) {
      instance.unwatch()
    }
  }

  static watch(filepath: string): Settings {
    const instance = new Settings(filepath)
    return instance
  }

  exists(): Promise<boolean> {
    return Settings.has(this.filepath)
  }

  get(fallback?: T): Promise<T> {
    return Settings.get<T>(this.filepath, fallback)
  }

  set(data: any): Promise<void> {
    return Settings.set(this.filepath, data)
  }

  unwatch() {
    super.removeAllListeners()
    this.watcher.close()
  }
}
