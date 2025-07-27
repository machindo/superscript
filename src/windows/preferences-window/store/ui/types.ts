export interface UiState {
  autoHideMenuBar: boolean
  colorTheme: 'light-theme' | 'dark-theme'
  displayPageOutline: boolean
  displayPanelCount: boolean
  editorFontFamily: string
  spellCheckEnabled: boolean
  spellCheckLocale: string
  wordCountSettings: WordCountSettings
}

export interface WordCountSettings {
  showCount: boolean
  showLimit: boolean
  page: number
  bubble: number
}
