import * as remote from '@electron/remote'
import { createHash } from 'crypto'
import { ipcRenderer } from 'electron'
import console from 'electron-log'
import { EventEmitter } from 'events'
import fs from 'fs-extra'
import JSZip, { JSZipObject } from 'jszip'
import mixin from 'lodash-decorators/mixin'
import path from 'path'
import { DeltaStatic } from 'quill'
import Delta from 'quill-delta'
import { Settings } from 'shared/settings'

import { SuperscriptComment } from '../../superscript.types'
import { renderer } from '../renderer'

export enum Directories {
  Assets = 'assets/'
}

export enum Files {
  Preferences = 'preferences.json',
  Script = 'script.json'
}

const maxRecentFiles = 10

@mixin(EventEmitter)
export class SuperscriptFile {
  backupFilename = ''
  $filename = ''
  isSaving = false
  savedScriptContents: { delta: DeltaStatic }
  $tempDirectory: string
  zip: JSZip
  onRead: (fileDelta: Delta) => void

  get filename(): string {
    return this.$filename
  }

  set filename(value: string) {
    this.$filename = value

    const filePath = path.dirname(value)
    const basename = path.basename(value, '.sup')
    const timestamp = new Date().toISOString().slice(0, 16).replace(/:/, '-')

    this.backupFilename = `${filePath}/~${basename}~${timestamp}.sup`
  }

  get tempDirectory(): string {
    if (!this.$tempDirectory) {
      if (this.filename) {
        this.$tempDirectory = path.join(remote.app.getPath('temp'), createHash('md5').update(this.filename).digest('hex'), '/')
      } else {
        this.$tempDirectory = path.join(remote.app.getPath('temp'), Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(), '/')
      }
    }

    return this.$tempDirectory
  }

  constructor() {
    this.zip = new JSZip()
  }

  async close() {
    fs.remove(this.backupFilename)
  }

  // Returns the relative path of the new file
  async importAsset(filename: string): Promise<Error | string | void> {
    try {
      const relativePath = path.join(Directories.Assets, path.basename(filename))
      const buffer = await fs.readFile(filename)
      const tempPath = path.join(this.tempDirectory, relativePath)

      // Copy file to zip file
      // Zip requires forward slash for subdirectories
      this.zip.file<'uint8array'>(`${Directories.Assets}/${path.basename(filename)}`, buffer)

      // Copy file to temp directory
      await fs.outputFile(tempPath, buffer)

      return relativePath
    } catch (e) {
      console.error(e)
      return e
    }
  }

  setDocument(filename: string) {
    const basename = path.basename(filename, '.sup')

    this.filename = filename
    this.addRecentDocument(filename)

    renderer.win.setDocumentEdited(false)
    renderer.win.setRepresentedFilename(filename)
    renderer.win.setTitle(basename)

    document.title = basename
  }

  async open(filename: string): Promise<{ comments?: SuperscriptComment[], delta?: DeltaStatic, error?: Error, recoverable?: boolean }> {
    this.setDocument(filename)

    try {
      const promises: Promise<void>[] = []

      const rawFile = await fs.readFile(filename)
      await this.zip.loadAsync(rawFile)

      // Copy zip contents to temp directory
      this.zip.forEach((relativePath: string, file: JSZipObject) => {
        if (!relativePath.endsWith('/')) {
          promises.push(new Promise(async (resolve, reject) => {
            try {
              const uint8array = await file.async('uint8array')
              const tempPath = path.join(this.tempDirectory, relativePath)
              await fs.outputFile(tempPath, uint8array)
              resolve()
            } catch (error) {
              reject(error)
            }
          }))
        }
      })

      // Wait for all files to be copied to the temp directory before continuing
      // Otherwise, the image files won't exist before the <img> tags load
      await Promise.all(promises)

      return this.readData(Files.Script)
    } catch (error) {
      const tempDirectoryExists = await fs.pathExists(this.tempDirectory)

      if (tempDirectoryExists) {
        console.error(error, '... but recoverable')
        return { error, recoverable: true }
      } else {
        console.error(error)
        this.removeRecentDocument(filename)
        return { error }
      }
    }
  }

  async recoverCorruptFile(): Promise<{ comments?: SuperscriptComment[], delta?: DeltaStatic, error?: Error }> {
    try {
      const itemPaths = await fs.readdir(this.tempDirectory)

      // Copy all temp files to zip file
      for (const itemPath of itemPaths) {
        // Ignore hidden files like .DS_Store
        if (!/^\./.test(itemPath)) {
          const itemFullPath = path.join(this.tempDirectory, itemPath)
          const itemStats = await fs.stat(itemFullPath)

          if (itemStats.isFile()) {
            const buffer = await fs.readFile(itemFullPath)
            this.zip.file<'uint8array'>(itemPath, buffer)
          } else if (itemStats.isDirectory()) {
            // Copy contents of subdirectories (/assets)
            const assetPaths = await fs.readdir(itemFullPath)

            for (const assetPath of assetPaths) {
              const assetFullPath = path.join(itemFullPath, assetPath)
              const assetStats = await fs.stat(assetFullPath)

              if (!assetStats.isDirectory()) {
                const buffer = await fs.readFile(assetFullPath)
                this.zip.file<'uint8array'>(`${itemPath}/${assetPath}`, buffer)
              }
            }
          }
        }
      }

      return await this.readData(Files.Script)
    } catch (error) {
      return { error }
    }
  }

  async renameTempDirectory(): Promise<void> {
    try {
      const oldTempDirectory = this.tempDirectory
      delete this.$tempDirectory
      const newTempDirectory = this.tempDirectory

      if (oldTempDirectory !== newTempDirectory) {
        return fs.rename(oldTempDirectory, newTempDirectory)
      }
    } catch {
      // Do nothing
    }
  }

  async read(filename: string): Promise<{ comments?: SuperscriptComment[], delta?: DeltaStatic, error?: Error }> {
    try {
      const rawFile = await fs.readFile(filename)
      await this.zip.loadAsync(rawFile)
      return this.readData(Files.Script)
    } catch (error) {
      console.error(error)
      return { error }
    }
  }

  async readData(filename: Files): Promise<any> {
    const filePath = path.join(this.tempDirectory, filename)

    if (await fs.pathExists(filePath)) {
      const file = await fs.readFile(filePath, 'utf8')

      if (file) {
        const data = JSON.parse(file)

        if (filename === Files.Script) {
          this.savedScriptContents = data
        }

        return data
      }

      return null
    }
  }

  async saveZip() {
    if (this.filename) {
      this.isSaving = true

      try {
        const zipped = await this.zip.generateAsync({ type: 'uint8array' })
        await fs.outputFile(this.filename, zipped)
      } catch (e) {
        alert(`Save failed. Please try again.\n\nIf save keeps failing, contact support@superscript.app\n\nError: ${e}`)
        console.error(e)
      }

      // Give file watcher a little time to fire before setting this
      setTimeout(() => this.isSaving = false, 500)
    }
  }

  async saveBackupZip() {
    if (this.filename) {
      this.isSaving = true

      try {
        const zipped = await this.zip.generateAsync({ type: 'uint8array' })
        await fs.outputFile(this.backupFilename, zipped)
      } catch (e) {
        alert(`Save failed. Please try again.\n\nIf save keeps failing, contact support@superscript.app\n\nError: ${e}`)
        console.error(e)
      }

      // Give file watcher a little time to fire before setting this
      setTimeout(() => this.isSaving = false, 500)
    }
  }

  /**
   * Set data to be saved when saveZip() is called
   */
  async store(filename: Files, data: any) {
    try {
      const stringified = JSON.stringify(data)

      // Store to temp directory first
      try {
        const tempPath = path.join(this.tempDirectory, filename)
        await fs.outputFile(tempPath, stringified)
      } catch (e) {
        console.error(e)
      }

      // Store to zip
      this.zip.file<'text'>(filename, stringified)

      if (filename === Files.Script) {
        this.savedScriptContents = data
      }

      await this.saveZip()
    } catch (e) {
      console.error(e)
    }
  }

  async storeBackup(filename: Files, data: any) {
    try {
      const stringified = JSON.stringify(data)

      // Store to zip
      this.zip.file<'text'>(filename, stringified)

      if (filename === Files.Script) {
        this.savedScriptContents = data
      }

      await this.saveBackupZip()
    } catch (e) {
      console.error(e)
    }
  }

  async addRecentDocument(filename: string) {
    let files: string[] = await Settings.get<string[]>('recentFiles', [])

    files = files.filter((f) => f !== filename)

    files.unshift(filename)

    if (files.length > maxRecentFiles) {
      files.length = maxRecentFiles
    }

    await Settings.set('recentFiles', files)
    ipcRenderer.send('updateRecentFiles')
    remote.app.addRecentDocument(filename)
  }

  async removeRecentDocument(filename: string) {
    let files: string[] = await Settings.get<string[]>('recentFiles', [])

    files = files.filter((f) => f !== filename)

    await Settings.set('recentFiles', files)
    ipcRenderer.send('updateRecentFiles')
    remote.app.addRecentDocument(filename)
  }
}
