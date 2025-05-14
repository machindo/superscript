import numbered from 'numbered'
import { DeltaStatic, StringMap } from 'quill'
import { Superscript } from 'windows/superscript'

export class Rtf {
  comicPageCount = 0
  frontmatter: { [key: string]: string | string[] } = {}
  rawFrontmatter = ''
  value = ''

  get contents(): string {
    return '{\\rtf1\\ansi{\\fonttbl\\f0\\fmodern\\fcharset0 Courier;}\\f0\\fs24\n' +
      this.info +
      this.header +
      this.footer +
      this.value +
      '}'
  }

  get footer(): string {
    return '{\\footer{\\qr\\chpgn}}'
  }

  get header(): string {
    const issue = this.frontmatter.issue ? `. ${this.frontmatter.issue}` : ''
    const writer = this.frontmatter.writer ? (this.frontmatter.writer as string).replace('\n', ', ') : ''

    return `{\\header ${this.frontmatter.title}${issue} (${this.comicPageCount} pages) by ${writer} }`
  }

  get info(): string {
    const writer = this.frontmatter.writer ? (this.frontmatter.writer as string).replace('\n', ', ') : ''

    return `{\\info {\\title ${this.frontmatter.title}}{\\author ${writer}}}\n{\\viewkind1}\n`
  }

  constructor(delta: DeltaStatic) {
    delta.eachLine((line, attributes, i) => this.transformLine(line, attributes, i))
    this.frontmatter = Superscript.parseFrontmatter(this.rawFrontmatter)
  }

  transformLine(line: DeltaStatic, attributes: StringMap, lineNumber: number) {
    if (line.ops) {
      if (lineNumber === 0) {
        this.value += '\\titlepg{\\headerf }{\\footerf }\n'
      } else if (attributes.header === 1) {
        // Page heading
        this.value += '\\page\n'
      } else if (attributes.blockquote) {
        // Dialog
        this.value += '\\li720\\ri720 '

        if (line.ops && line.ops[0] && line.ops[0].insert) {
          line.ops[0].insert = line.ops[0].insert.trimLeft()
        }
      }

      for (const op of line.ops) {
        if (attributes.frontmatter) {
          this.rawFrontmatter += op.insert + '\n'

          if (lineNumber === 0) {
            // Title line
            this.value += `{\\b\\fs43 ${op.insert}}`
          } else {
            this.value += op.insert
          }
        } else if (attributes.header === 1) {
          // Page heading
          const pageNumberMatches = op.insert.match(/\d+/g)

          if (pageNumberMatches) {
            const headingText = pageNumberMatches
              .map((n: string) => numbered(parseInt(n, 10)).toLocaleUpperCase())
              .join(' — ')

            this.value += `{\\b\\fs43 ${headingText}}`
            this.comicPageCount = parseInt(pageNumberMatches[pageNumberMatches.length - 1], 10)
          } else {
            this.value += op.insert.toLocaleUpperCase()
            this.comicPageCount++
          }
        } else if (attributes.header === 2) {
          // Panel heading
          this.value += `{\\b\\fs32 ${op.insert}}`
        } else if (attributes.header === 3) {
          // Character heading
          this.value += op.insert.toLocaleUpperCase()
        } else {
          // Description or dialog
          let text = this.escapeCharacters(op.insert)

          if (op.attributes && op.attributes.link) {
            text = `{\\ul ${text}}`
          }

          if (op.attributes && op.attributes.bold) {
            text = `{\\b ${text}}`
          }

          if (op.attributes && op.attributes.italic) {
            text = `{\\i ${text}}`
          }

          this.value += text
        }
      }
    }

    if (line.ops && line.ops.length && line.ops[0] && line.ops[0].insert.length) {
      this.value += '\\par\\pard\n'
    } else {
      this.value += '\\line\n'
    }
  }

  escapeCharacters(text: string) {
    return text.replace(/\\|\{|\}/g, ch => '\\' + ch)
  }
}
