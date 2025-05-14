import { BehaviorState } from './behavior/types'
import { UiState } from './ui/types'

export interface RootState {
  dirty: boolean

  // Modules
  behavior?: BehaviorState
  ui?: UiState
}
