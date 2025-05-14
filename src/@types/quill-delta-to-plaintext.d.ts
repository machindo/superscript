declare module 'quill-delta-to-plaintext' {
  import { DeltaStatic } from 'quill'

  function toPlaintext(delta: DeltaStatic): string

  export = toPlaintext
}
