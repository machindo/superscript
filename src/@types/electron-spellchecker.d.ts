// Type definitions for electron-spellchecker 1.1
// Project: https://github.com/paulcbetts/electron-spellchecker
// Definitions by: Daniel Perez Alvarez <https://github.com/unindented>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference types="electron"/>

// Override default definitions to include SpellChecker

module 'electron-spellchecker' {
  export class SpellChecker {
    isMisspelled(word: string): boolean
    getCorrectionsForMisspelling(word: string): string[]
    add(word: string): void
    remove(word: string): void
    checkSpelling(corpus: string): { start: number, end: number }[]
    checkSpellingAsync(corpus: string): Promise<{ start: number, end: number }[]>
  }

  export class DictionarySync {
    async loadDictionaryForLanguage(langCode: string, cacheOnly = false): Promise<any>
  }

  class MisspelledCache {
    reset(): void
  }

  export class SpellCheckHandler {
    currentSpellchecker: SpellChecker

    attachToInput(): void
    autoUnloadDictionariesOnBlur(): void
    dictionarySync: DictionarySync
    async loadDictionaryForLanguageWithAlternatives(langCode: string, cacheOnly = false): Promise<any>
    provideHintText(inputText: string): void
    switchLanguage(language: string): Promise<void>
    getCorrectionsForMisspelling(misspelledWord: string): Promise<string[]>
    addToDictionary(text: string): void
    isMisspelledCache: MisspelledCache

    unsubscribe(): void
  }

  export class ContextMenuBuilder {
    constructor(
      spellCheckHandler?: SpellCheckHandler,
      target?: Electron.BrowserWindow | Electron.WebviewTag | null,
      debugMode?: boolean,
      processMenu?: (menu: Electron.Menu) => Electron.Menu
    );

    setAlternateStringFormatter(formatter: {
      [key: string]: ContextMenuFormatter;
    }): void

    showPopupMenu(info: Electron.ContextMenuParams): void
  }

  export class ContextMenuListener {
    constructor(
      handler: (info: Electron.ContextMenuParams) => void,
      target?: Electron.BrowserWindow | Electron.WebviewTag | null
    );

    unsubscribe(): void
  }

  export function setGlobalLogger(logger: any): void
}
