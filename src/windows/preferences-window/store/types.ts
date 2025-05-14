import { UiState } from './ui/types'

export interface RootState {
  autoUpdate: boolean
  // Modules
  ui?: UiState
}
