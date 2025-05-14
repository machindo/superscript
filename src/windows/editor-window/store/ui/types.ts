export interface UiState {
  autoHideMenuBar: boolean
  colorTheme: 'light-theme' | 'dark-theme'
  dictionaryTerm: string
  dictionaryToolbarVisible: boolean
  diffToolbarVisible: boolean
  displayPageOutline: boolean
  displayPanelCount: boolean
  editorFontFamily: string
  formatToolbarVisible: boolean
  goToText: string
  goToToolbarVisible: boolean
  searchText: string
  searchToolbarVisible: boolean
  showCharacterNumbers: boolean
  spellCheckLocale: string
  view: 'editor' | 'lobby' | null
  wordCountSettings: WordCountSettings
}

export interface WordCountSettings {
  showCount: boolean
  showLimit: boolean
  page: number
  bubble: number
}
