import ParchmentClass from 'parchment'
import Quill from 'quill'

const Parchment = Quill.import('parchment') as typeof ParchmentClass

class StylePropertyAttributor extends Parchment.Attributor.Style {
  static keys(node: Element): string[] {
    return (node.getAttribute('style') || '').split(';').map(function (value) {
      const arr = value.split(':')
      return arr[0].trim()
    })
  }

  add(node: HTMLElement, value: string): boolean {
    if (!this.canAdd(node, value)) return false
    node.style.setProperty(this.keyName, value)

    if (this.keyName === '--panel-count') {
      const singular = parseInt(value, 10) === 1
      node.style.setProperty(`${this.keyName}-string`, `'${value} panel${singular ? '' : 's'}'`)
    } else {
      node.style.setProperty(`${this.keyName}-string`, `'${value}'`)
    }

    return true
  }

  remove(node: HTMLElement): void {
    node.style.removeProperty(this.keyName)
    node.style.removeProperty(`${this.keyName}-string`)
  }

  value(node: HTMLElement): string {
    const value = node.style.getPropertyValue(this.keyName)
    return this.canAdd(node, value) ? value : ''
  }
}

const OriginalHeader = Quill.import('formats/header')

class Header extends OriginalHeader {
  formatAt(index: number, length: number, format: string, value: any) {
    switch (format) {
      case 'frontmatter':
      case 'header':
      case 'highlight':
      case 'offpage':
      case 'panelCount':
      case 'wordCount':
        super.formatAt(index, length, format, value)
    }
  }
}

const Comment = new Parchment.Attributor.Attribute('comment', 'comment', {
  scope: Parchment.Scope.INLINE_ATTRIBUTE
})

const PanelCount = new StylePropertyAttributor('panelCount', '--panel-count')

const WordCount = new StylePropertyAttributor('wordCount', '--word-count')

const Spellcheck = new Parchment.Attributor.Attribute('spellcheck', 'spellcheck', {
  scope: Parchment.Scope.INLINE_ATTRIBUTE
})

const Found = new Parchment.Attributor.Class('highlight', 'highlight', {
  scope: Parchment.Scope.INLINE_ATTRIBUTE,
  whitelist: ['found', 'primary']
})

const Frontmatter = new Parchment.Attributor.Class('frontmatter', 'frontmatter', {
  scope: Parchment.Scope.BLOCK_ATTRIBUTE
})

const Offpage = new Parchment.Attributor.Class('offpage', 'offpage', {
  scope: Parchment.Scope.BLOCK_ATTRIBUTE
})

Parchment.register(Comment)
Parchment.register(Found)
Parchment.register(Frontmatter)
Parchment.register(Offpage)
Parchment.register(PanelCount)
Parchment.register(Spellcheck)
Parchment.register(WordCount)

Quill.register(Comment)
Quill.register(Header, true)
Quill.register(Found)
Quill.register(Frontmatter)
Quill.register(Offpage)
Quill.register(PanelCount)
Quill.register(Spellcheck)
Quill.register(WordCount)
