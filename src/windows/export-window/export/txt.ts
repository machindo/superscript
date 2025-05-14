import { DeltaStatic } from 'quill'
import Delta from 'quill-delta'
import { CharacterHeadingStyle, ExportSettings } from 'windows/superscript.formatting'
import { characterHeadingType, dialogType, pageHeadingType, panelHeadingType } from 'windows/superscript.types'

const alpha = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv']

export class Txt {
  contents = ''
  delta: DeltaStatic
  listNumbers: number[] = []

  constructor(delta: DeltaStatic, private config: ExportSettings) {
    this.delta = new Delta(delta.ops)
    this.transformLines()
  }

  transformLines() {
    let characterNumber = 1

    this.delta.eachLine((line, attributes, _lineNumber) => {
      if (line.ops) {
        let lineText = ''

        // Concat line operations, with styling
        for (const op of line.ops) {
          if (typeof op.insert === 'string') {
            lineText += op.insert
          }
        }

        if (attributes.header) {
          if (lineText.startsWith('#')) {
            // Markdown-style header
            lineText = lineText.replace(/^#+\s+/, '')
          } else {
            if (attributes.header === 1) {
              // Page heading
              if (/\d/.test(lineText)) {
                lineText = pageHeadingType.transform(lineText, this.config.pageHeadingStyle)
              }

              characterNumber = 1
            } else if (attributes.header === 2) {
              // Panel heading
              lineText = panelHeadingType.transform(lineText, this.config.panelHeadingStyle)
            } else if (attributes.header === 3) {
              // Character heading
              lineText = characterHeadingType.transform(lineText, this.config.characterHeadingStyle)

              if (this.config.characterHeadingStyle === CharacterHeadingStyle.NumeralAndName) {
                lineText = `${characterNumber++}. ${lineText}`
              }
            }
          }
        } else if (attributes.blockquote) {
          lineText = dialogType.transform(lineText, this.config.dialogStyle).trim()
        } else if (attributes.list) {
          const indent = attributes.indent || 0

          for (let i = 0; i < indent; i++) {
            this.contents += '    '
          }

          if (attributes.list === 'bullet') {
            this.contents += '* '
          } else {
            let listNum: string

            if (indent + 1 > this.listNumbers.length) {
              this.listNumbers.push(0)
            } else {
              this.listNumbers.splice(indent + 1, this.listNumbers.length - indent)
            }

            this.listNumbers[indent]++

            switch (indent % 3) {
              case 0:
                listNum = this.listNumbers[indent].toString()
                break
              case 1:
                listNum = alpha[this.listNumbers[indent]]
                break
              default:
                listNum = roman[this.listNumbers[indent]]
            }

            this.contents += `${listNum}. `
          }
        }

        this.contents += `${lineText}\n`
      }
    })
  }
}
