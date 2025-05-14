import { DeltaStatic, StringMap } from 'quill'
import Delta from 'quill-delta'
import { ExportSettings } from 'windows/superscript.formatting'
import { characterHeadingType, dialogType, pageHeadingType, panelHeadingType } from 'windows/superscript.types'

export class Md {
  contents = ''
  listNumbers: number[] = []

  constructor(delta: DeltaStatic, private config: ExportSettings) {
    delta = new Delta(delta.ops)
    delta.eachLine((line, attributes, i) => this.transformLine(line, attributes, i))
  }

  transformLine(line: DeltaStatic, attributes: StringMap, lineNumber: number) {
    if (line.ops) {
      let lineText = ''

      // Concat line operations, with styling
      for (const op of line.ops) {
        if (typeof op.insert === 'string') {
          let opText = this.escapeCharacters(op.insert)

          if (op.attributes && op.attributes.link) {
            opText = `[${opText}]`
          }

          if (op.attributes && op.attributes.bold) {
            opText = `**${opText}**`
          }

          if (op.attributes && op.attributes.italic) {
            opText = `*${opText}*`
          }

          lineText += opText
        } else if (op.insert.image && op.attributes && op.insert.image.match(/^https?:\/\//)) {
          lineText += `![${op.attributes.alt}](${op.insert.image})`
        }
      }

      if (attributes.header) {
        lineText = line.ops.reduce((value, op) => value + op.insert, '')
      }

      if (lineNumber === 0) {
        // Script title
        this.contents += `# `
      } else if (attributes.header) {
        if (lineText.startsWith('#')) {
          // Raise each heading 1 level
          lineText = '#' + lineText
        } else {
          if (attributes.header === 1) {
            // Page heading
            if (/\d/.test(lineText)) {
              lineText = pageHeadingType.transform(lineText, this.config.pageHeadingStyle)
            }

            this.contents += `## `
          } else if (attributes.header === 2) {
            // Panel heading
            lineText = panelHeadingType.transform(lineText, this.config.panelHeadingStyle)
            this.contents += `### `
          } else if (attributes.header === 3) {
            // Character heading
            lineText = characterHeadingType.transform(lineText, this.config.characterHeadingStyle)
          }
        }
      } else if (attributes.blockquote) {
        lineText = dialogType.transform(lineText, this.config.dialogStyle).trim()
        this.contents += '> '
      } else if (attributes.list) {
        const indent = attributes.indent || 0

        for (let i = 0; i < indent; i++) {
          this.contents += '    '
        }

        if (attributes.list === 'bullet') {
          this.contents += '* '
        } else {
          if (indent + 1 > this.listNumbers.length) {
            this.listNumbers.push(1)
          } else {
            this.listNumbers.splice(indent + 1, this.listNumbers.length - indent)
          }

          this.contents += `${this.listNumbers[indent]++}. `
        }
      }

      this.contents += `${lineText}\n`
    }
  }

  escapeCharacters(text: string) {
    return text.replace(/\\|\`|\*|\_|\{|\}|\[|\]|\(|\)|\#|(^\+)|(^\-)/g, ch => '\\' + ch)
  }
}
