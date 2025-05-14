import { DeltaStatic } from 'quill'
import { SuperscriptComment } from 'windows/superscript.types'

export interface ContentState {
  comments: SuperscriptComment[],
  script: DeltaStatic
}
