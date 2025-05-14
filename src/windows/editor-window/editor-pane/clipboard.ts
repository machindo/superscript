import Quill from 'quill'

const Clipboard = Quill.import('modules/clipboard')

export class ClipboardScrollFix extends Clipboard {
  scroller: HTMLElement

  onPaste(e: any) {
    const scrollTop = this.scroller.scrollTop
    super.onPaste(e)

    setTimeout(() => {
      this.scroller.scrollTop = scrollTop
    })
  }
}
