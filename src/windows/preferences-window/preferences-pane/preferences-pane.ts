import { ipcRenderer } from 'electron'
import { Debounce } from 'lodash-decorators/debounce'
import Vue from 'vue'
import Component from 'vue-class-component'
import { Action, namespace, State } from 'vuex-class'
import locales from 'windows/locales.json'

import { state } from '../store/ui'
import { WordCountSettings } from '../store/ui/types'
import { Ui } from '../ui/ui'

import './preferences-pane.styl'
import WithRender from './preferences-pane.vue.html'

const dictionaryModule = namespace('dictionary')
const uiModule = namespace('ui')

// @ts-ignore
@WithRender
@Component
export class PreferencesPane extends Vue {
  $root!: Ui

  availableFonts: string[] = []
  defaultEditorFontFamily = state.editorFontFamily
  isMac = process.platform === 'darwin'
  newWord = ''

  @State autoUpdate: boolean
  @Action updateAutoUpdate: Function

  @dictionaryModule.State words: string[]
  @dictionaryModule.Action addWordsToDictionary: (words: string[]) => void
  @dictionaryModule.Action removeWordsFromDictionary: (words: string[]) => void

  @uiModule.State autoHideMenuBar: boolean
  @uiModule.State colorTheme: 'light-theme' | 'dark-theme'
  @uiModule.State displayPanelCount: boolean
  @uiModule.State('editorFontFamily') editorFontFamilyStore: string
  @uiModule.State spellCheckEnabled: boolean
  @uiModule.State spellCheckLocale: string
  @uiModule.State wordCountSettings: WordCountSettings

  @uiModule.Action updateAutoHideMenuBar: Function
  @uiModule.Action updateColorTheme: Function
  @uiModule.Action updateDisplayPanelCount: Function
  @uiModule.Action updateEditorFontFamily: Function
  @uiModule.Action updateSpellCheckEnabled: Function
  @uiModule.Action updateSpellCheckLocale: Function

  @uiModule.Action toggleWordCount: Function
  @uiModule.Action toggleWordCountLimit: Function
  @uiModule.Action updateWordsPerPage: Function
  @uiModule.Action updateWordsPerBubble: Function

  readonly locales = locales

  get autoUpdateValue() {
    return this.autoUpdate
  }

  set autoUpdateValue(value: boolean) {
    this.updateAutoUpdate(value)
  }

  get showPanelCount() {
    return this.displayPanelCount
  }

  @Debounce(200)
  set showPanelCount(value) {
    this.updateDisplayPanelCount(value)
  }

  get wordCountSettingsShowCount() {
    return this.wordCountSettings.showCount
  }

  @Debounce(200)
  set wordCountSettingsShowCount(value) {
    this.toggleWordCount(value)
  }

  get wordCountSettingsShowLimit() {
    return this.wordCountSettings.showLimit
  }

  @Debounce(200)
  set wordCountSettingsShowLimit(value) {
    this.toggleWordCountLimit(value)
  }

  get wordCountSettingsPage() {
    return this.wordCountSettings.page
  }

  @Debounce(200)
  set wordCountSettingsPage(value) {
    // Make sure value is a positive integer
    if (value && value > 0 && value === Math.round(value)) {
      this.updateWordsPerPage(value)
    }
  }

  get wordCountSettingsBubble() {
    return this.wordCountSettings.bubble
  }

  @Debounce(200)
  set wordCountSettingsBubble(value) {
    // Make sure value is a positive integer
    if (value && value > 0 && value === Math.round(value)) {
      this.updateWordsPerBubble(value)
    }
  }

  set autoHideMenuBarChoice(value: boolean) {
    this.updateAutoHideMenuBar(value)
  }

  get autoHideMenuBarChoice(): boolean {
    return this.autoHideMenuBar
  }

  set colorThemeChoice(value: 'light-theme' | 'dark-theme') {
    this.updateColorTheme(value)
  }

  get colorThemeChoice(): 'light-theme' | 'dark-theme' {
    return this.colorTheme
  }

  set editorFontFamily(value: string) {
    this.updateEditorFontFamily(value)
  }

  get editorFontFamily(): string {
    return this.editorFontFamilyStore
  }

  @Debounce(200)
  set isSpellCheckEnabled(value: boolean) {
    this.updateSpellCheckEnabled(value)
  }

  get isSpellCheckEnabled() {
    return this.spellCheckEnabled
  }

  set spellCheckLang(value: string) {
    this.updateSpellCheckLocale(value)
  }

  get spellCheckLang(): string {
    return this.spellCheckLocale
  }

  async mounted() {
    const fonts = await ipcRenderer.invoke('listFonts')
    this.setAvailableFonts(fonts)
  }

  setAvailableFonts(fonts: string[]) {
    this.availableFonts = fonts
  }

  resetEditorFontFamily() {
    this.editorFontFamily = this.defaultEditorFontFamily
  }

  learnWord() {
    this.addWordsToDictionary([this.newWord])
    this.newWord = ''
  }
}
