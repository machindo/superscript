import path from 'path'
import pdfMake from 'pdfmake'
import { DeltaStatic, StringMap } from 'quill'
import Delta from 'quill-delta'
import { Superscript } from 'windows/superscript'
import { characterHeadingType, dialogType, pageHeadingType, panelHeadingType } from 'windows/superscript.types'

import { CharacterDialogPositioning, CharacterHeadingStyle, ExportSettings, PanelDescriptionPositioning, PanelHeadingStyle, PhysicalPageCount, TitleFormat } from '../../superscript.formatting'

import { pdfFonts } from './vfs-fonts'

type blobCallback = (blob: Blob) => void
type bufferCallback = (buffer: Buffer) => void
type dataUrlCallback = (dataUrl: string) => void

interface CompiledPdf {
  getBlob(cb?: blobCallback): void
  getBuffer(cb?: bufferCallback): void
  getDataUrl(cb?: dataUrlCallback): void
}

pdfMake.vfs = pdfFonts.pdfMake.vfs

pdfMake.fonts = {
  'Courier Prime Sans': {
    normal: 'Courier Prime Sans.ttf',
    bold: 'Courier Prime Sans Bold.ttf',
    italics: 'Courier Prime Sans Italic.ttf',
    bolditalics: 'Courier Prime Sans Bold Italic.ttf'
  }
}

export class Pdf {
  comicPageCount = 0
  currentPageHeading: any = null
  currentPageHeadingHasDescription = false
  currentPanelCount = ''
  currentListBlocks: any = []

  docDefinition: any
  docContent: any = [{ text: [] }]

  frontmatter: { [key: string]: string | string[] } = {}
  rawFrontmatter: string = ''

  _compiledPdf: CompiledPdf
  _currentCharacterHeadingNumber = 1
  _onReadyCallbacks: Function[] = []

  set compiledPdf(value: CompiledPdf) {
    this._compiledPdf = value
    this.onReady()
  }

  get compiledPdf(): CompiledPdf {
    return this._compiledPdf
  }

  _linesProcessing = 0

  set linesProcessing(value: number) {
    this._linesProcessing = value
    this.onReady()
  }

  get linesProcessing(): number {
    return this._linesProcessing
  }

  get isReady(): boolean {
    return this.compiledPdf && this.linesProcessing === 0
  }

  constructor(private delta: DeltaStatic, private config: ExportSettings, private tempDirectory: string) {
    delta = new Delta(delta.ops)

    if (!this.config) {
      this.config = new ExportSettings()
    }

    this.comicPageCount = 0
    this.currentPanelCount = ''

    delta.eachLine((line, attributes, i) => this.transformLine(line, attributes, i))

    this.frontmatter = Superscript.parseFrontmatter(this.rawFrontmatter)
    this.setDocDefinition(this.config)

    this.compiledPdf = pdfMake.createPdf(this.docDefinition)
  }

  setDocDefinition(config: ExportSettings) {
    const headerTitle: string[] = []
    const writer = this.frontmatter.writer ? ` by ${this.frontmatter.writer}` : ''

    if (this.frontmatter.title) {
      headerTitle.push(this.frontmatter.title as string)
    }

    if (this.frontmatter.issue) {
      const issueText = /^\d+$/.test(this.frontmatter.issue as string) ? ` #${this.frontmatter.issue}` : `: ${this.frontmatter.issue}`
      headerTitle.push(issueText)
    }

    this.docDefinition = {
      pageSize: config.pageSize,
      content: [
        config.titleFormat === TitleFormat.CoverPage ? this.coverPageContent() : this.pageOneTitle(),
        ...this.docContent
      ],
      defaultStyle: {
        font: config.fontFamily,
        fontSize: config.fontSize
      },
      header: (currentPage: number) => {
        if (config.titleFormat === TitleFormat.PageOneHeader || currentPage > 1) {
          return {
            columns: [
              {
                width: 'auto',
                text: `${headerTitle.join('')} (${this.comicPageCount} page${this.comicPageCount === 1 ? '' : 's'}) `
              },
              {
                width: '*',
                text: writer,
                alignment: 'right'
              }
            ],
            margin: [40, 20],
            style: 'headerFooter'
          }
        }
      },
      info: {
        title: this.frontmatter.title,
        author: writer,
        creator: 'Superscript',
        producer: 'Superscript'
      },
      footer: (currentPage: number, pageCount: number) => {
        let text = ''

        if (config.titleFormat === TitleFormat.CoverPage) {
          currentPage--
          pageCount--
        }

        if (currentPage) {
          switch (config.physicalPageCount) {
            case PhysicalPageCount.Page:
              text = currentPage.toString()
              break
            case PhysicalPageCount.PageOfTotal:
              text = `${currentPage} of ${pageCount}`
          }
        }

        return {
          text,
          alignment: 'right',
          margin: [40, 20],
          style: 'headerFooter'
        }
      },
      pageMargins: [36, 72],
      styles: {
        headerFooter: {
          fontSize: config.fontSize * 10 / 12
        },
        pageHeading: {
          fontSize: config.fontSize * 22 / 12,
          bold: true,
          decoration: 'underline'
        },
        panelHeading: {
          fontSize: config.fontSize,
          bold: true
        },
        markdownHeader2: {
          fontSize: config.fontSize * 18 / 12,
          bold: true
        },
        markdownHeader3: {
          fontSize: config.fontSize * 16 / 12,
          bold: true
        },
        markdownHeader4: {
          fontSize: config.fontSize * 14 / 12,
          bold: true
        },
        markdownHeader5: {
          fontSize: config.fontSize,
          bold: true
        },
        markdownHeader6: {
          fontSize: config.fontSize * 10 / 12,
          bold: true
        }
      },
      title: this.frontmatter.title
    }
  }

  onReady() {
    if (this.isReady) {
      for (const cb of this._onReadyCallbacks) {
        cb()
      }
    }
  }

  getCompiledPdf(): Promise<CompiledPdf> {
    return new Promise((resolve) => {
      if (this.isReady) {
        resolve(this.compiledPdf)
      } else {
        this._onReadyCallbacks.push(() => { resolve(this.compiledPdf) })
      }
    })
  }

  coverPageContent(): any[] {
    return [
      this.frontmatter.title ? {
        text: this.frontmatter.title || '',
        margin: [0, 300, 0, 10],
        alignment: 'center',
        bold: true,
        fontSize: 30
      } : {},
      this.frontmatter.writer ? {
        text: `by ${this.frontmatter.writer} `,
        margin: [0, 0, 0, 10],
        alignment: 'center',
        fontSize: 22
      } : {},
      this.frontmatter.volume ? {
        text: `Volume: ${this.frontmatter.volume}`,
        margin: [0, 0, 0, 10],
        alignment: 'center',
        fontSize: 22
      } : {},
      this.frontmatter.issue ? {
        text: `Issue: ${this.frontmatter.issue}`,
        margin: [0, 0, 0, 10],
        alignment: 'center',
        fontSize: 22
      } : {},
      {
        text:
          (this.frontmatter.copyright ? `© ${this.frontmatter.copyright} \n\n` : '') +
          (this.frontmatter.email ? `${this.frontmatter.email} \n\n` : '') +
          (this.frontmatter.phone ? `${this.frontmatter.phone} \n\n` : '') +
          (this.frontmatter.address ? `${this.frontmatter.address} \n\n` : ''),
        margin: [0, 200, 0, 0]
      },
      this.config.outputExtraFrontmatter ? {
        text: this.formatFrontmatter()
      } : {}
    ]
  }

  pageOneTitle(): any[] {
    return [
      this.frontmatter.title ? {
        text: this.frontmatter.title || '',
        margin: [0, 0, 0, 10],
        bold: true,
        fontSize: 22
      } : {},
      this.frontmatter.writer ? {
        text: `by ${this.frontmatter.writer} `,
        margin: [0, 0, 0, 10],
        fontSize: 12
      } : {},
      this.frontmatter.volume ? {
        text: `Volume: ${this.frontmatter.volume}`,
        margin: [0, 0, 0, 10],
        fontSize: 12
      } : {},
      this.frontmatter.issue ? {
        text: `Issue: ${this.frontmatter.issue}`,
        margin: [0, 0, 0, 10],
        fontSize: 12
      } : {},
      {
        text:
          (this.frontmatter.copyright ? `© ${this.frontmatter.copyright} \n\n` : '') +
          (this.frontmatter.email ? `${this.frontmatter.email} \n\n` : '') +
          (this.frontmatter.phone ? `${this.frontmatter.phone} \n\n` : '') +
          (this.frontmatter.address ? `${this.frontmatter.address} \n\n` : '')
      },
      this.config.outputExtraFrontmatter ? {
        text: this.formatFrontmatter()
      } : {}
    ]
  }

  formatFrontmatter(): string {
    const frontmatter = { ...this.frontmatter }
    const usedKeys = ['title', 'writer', 'volume', 'issue', 'copyright', 'email', 'phone', 'address']
    const vars: string[] = []

    for (const [key, value] of Object.entries(frontmatter)) {
      const textValue = Array.isArray(value) ? value.join(', ') : value

      if (value && !key.startsWith('$') && !usedKeys.includes(key)) {
        vars.push(`${key}: ${textValue}`)
      }
    }

    return vars.join('\n')
  }

  newBlock(type: 'image' | 'ol' | 'text' | 'ul' = 'text'): any {
    const block = type === 'image' ? {} : { [type]: [] }
    this.docContent.push(block)
    return block
  }

  setCurrentPagePanelCount(count: number | string) {
    if (this.currentPageHeading) {
      const deleteCount = this.currentPageHeading.text.length > 2 ? 1 : 0
      const text = typeof count === 'string' ? ` ${count}` : ` (${count} panel${count === 1 ? '' : 's'})`

      this.currentPageHeading.text.splice(1, deleteCount, { text })
    }
  }

  async transformLine(line: DeltaStatic, attributes: StringMap, _i: number) {
    // Prevent onReady until line has been processed
    this.linesProcessing++
    const inList = !!attributes.list

    if (line.ops && attributes.frontmatter) {
      for (const op of line.ops) {
        this.rawFrontmatter += op.insert + '\n'
      }
    } else if (line.ops && line.ops.length) {
      let block: any

      if (attributes.blockquote && this.config.characterDialogPositioning === CharacterDialogPositioning.Columns) {
        // Dialog column

        block = { text: [] }

        if (this.docContent[this.docContent.length - 1].table) {
          // If previous block is a table with 2 columns
          // Use the previous block (the panel heading as the current block)
          const wrapperBlock = this.docContent[this.docContent.length - 1]

          if (wrapperBlock.table.body[0].length === 1) {
            wrapperBlock.table.body[0].push(block)
          } else {
            wrapperBlock.table.body.push(['', block])
          }
        } else {
          // If previous block is not a table with 2 columns
          const wrapperBlock = this.newBlock()

          delete wrapperBlock.text
          wrapperBlock.table = {
            widths: [150, '*'],
            body: [['', block]]
          }
          wrapperBlock.layout = {
            defaultBorder: false,
            paddingLeft: () => 0
          }
          wrapperBlock.margin = [0, 0, 0, 10]
        }
      } else if (!attributes.header && !attributes.blockquote
        && this.config.panelDescriptionPositioning === PanelDescriptionPositioning.SameLine
        && this.docContent[this.docContent.length - 1].headlineLevel === 2
        && this.docContent[this.docContent.length - 1].text.length < 3
      ) {
        // If previous block is a panel heading and description should be on the same line

        // Use the previous block (the panel heading) as the current block
        block = this.docContent[this.docContent.length - 1]

        // Delete newline at end of block
        block.text.pop()

        // Append space and colon if necessary to panel heading text
        switch (this.config.panelHeadingStyle) {
          case PanelHeadingStyle.PanelAndNumerals:
            block.text[0].text += ': '
            break
          case PanelHeadingStyle.PanelAndNumeralsWithPage:
          case PanelHeadingStyle.NumeralAndDot:
          case PanelHeadingStyle.NumeralWithPage:
            block.text[0].text += ' '
            break
          case PanelHeadingStyle.NumeralAndParenthesis:
            block.text[0].text += ' '
        }
      } else if (inList) {
        let wrapperBlock
        block = { text: [], margin: [0, 0, 0, 10] }

        if (this.currentListBlocks.length) {
          const targetIndent = attributes.indent || 0
          wrapperBlock = this.currentListBlocks[this.currentListBlocks.length - 1]

          if (attributes.list === 'bullet' && wrapperBlock.ol || attributes.list === 'ordered' && wrapperBlock.ul) {
            // If list types don't match, start a new list
            this.currentListBlocks.length = 0
          } else {
            // Get to correct indent level
            while (targetIndent > this.currentListBlocks.length - 1) {
              wrapperBlock = this.currentListBlocks[this.currentListBlocks.length - 1]
              const newBlock = {
                type: 'decimal',
                [attributes.list === 'bullet' ? 'ul' : 'ol']: []
              }

              if (attributes.list === 'ordered') {
                switch (targetIndent % 3) {
                  case 1:
                    newBlock.type = 'lower-alpha'
                    break
                  case 2:
                    newBlock.type = 'lower-roman'
                    break
                  case 0:
                    newBlock.type = 'decimal'
                }
              }

              (wrapperBlock.ul || wrapperBlock.ol).push(newBlock)
              this.currentListBlocks.push(newBlock)
            }

            while (targetIndent < this.currentListBlocks.length - 1) {
              this.currentListBlocks.pop()
            }

            wrapperBlock = this.currentListBlocks[this.currentListBlocks.length - 1]
          }
        }

        if (this.currentListBlocks.length === 0) {
          wrapperBlock = this.newBlock(attributes.list === 'bullet' ? 'ul' : 'ol')
          wrapperBlock.margin = [0, 0, 0, 20]
          this.currentListBlocks.push(wrapperBlock)
        }

        (wrapperBlock.ul || wrapperBlock.ol).push(block)
      } else {
        block = this.newBlock()
      }

      if (!inList) {
        this.currentListBlocks.length = 0
      }

      if (attributes.header) {
        const segment: any = { text: '' }

        block.text.push(segment)

        for (const op of line.ops) {
          if (typeof op.insert === 'string') {
            segment.text += op.insert
          }
        }

        if (segment.text.startsWith('#')) {
          // Markdown-style header

          block.headlineLevel = segment.text.match(/^#+/)[0].length
          block.margin = [0, 0, 0, 10]
          segment.text = segment.text.replace(/^#+\s+/, '')

          switch (block.headlineLevel) {
            case 1:
              if (this.config.titleFormat === TitleFormat.PageOneHeader && !this.currentPageHeading) {
                block.margin[1] = 22
              } else {
                block.pageBreak = 'before'
              }

              block.tocItem = true
              segment.style = 'pageHeading'

              this.currentPageHeading = block
              break
            default:
              segment.style = `markdownHeader${block.headlineLevel}`
          }
        } else {
          switch (attributes.header) {
            case 1:
              // Page heading
              const pageNumberMatches = segment.text.match(/\d+/g)

              block.headlineLevel = 1
              block.margin = [0, 0, 0, 10]
              block.tocItem = true

              // Only insert a page break before page 1 if creating a cover page
              if (this.config.titleFormat === TitleFormat.PageOneHeader && !this.currentPageHeading) {
                block.margin[1] = 22
              } else {
                block.pageBreak = 'before'
              }

              segment.style = 'pageHeading'

              this.currentPanelCount = ''
              this.currentPageHeading = block
              this.currentPageHeadingHasDescription = false

              if (pageNumberMatches) {
                this.comicPageCount = parseInt(pageNumberMatches[pageNumberMatches.length - 1], 10)
                segment.text = pageHeadingType.transform(segment.text, this.config.pageHeadingStyle)
              }

              this._currentCharacterHeadingNumber = 1
              break
            case 2:
              // Panel heading
              const panelNumberMatch = segment.text.match(/\d+/g)
              this.currentPanelCount = panelNumberMatch[0]

              block.headlineLevel = 2
              segment.style = 'panelHeading'

              if (this.currentPageHeading && !this.currentPageHeadingHasDescription) {
                this.setCurrentPagePanelCount(parseInt(panelNumberMatch[panelNumberMatch.length - 1], 10))
              }

              segment.text = panelHeadingType.transform(segment.text, this.config.panelHeadingStyle, this.comicPageCount)
              break
            case 3:
              segment.text = characterHeadingType.transform(segment.text, this.config.characterHeadingStyle)

              if (this.config.characterHeadingStyle === CharacterHeadingStyle.NumeralAndName) {
                segment.text = `${this._currentCharacterHeadingNumber++}. ${segment.text}`
              }

              switch (this.config.characterDialogPositioning) {
                case CharacterDialogPositioning.Center:
                  // Using https://i.pinimg.com/originals/cf/b1/d7/cfb1d7b5dc4dc526b076ab0655a6d4d0.jpg as a template
                  block.margin = [216, 0, 0, 0] // 3 inches from the left margin
                  break
                case CharacterDialogPositioning.Columns:
                  delete block.text
                  block.table = {
                    widths: [150, '*'],
                    body: [[segment]]
                  }
                  block.layout = {
                    defaultBorder: false,
                    paddingLeft: () => 0
                  }
                  block.margin = [0, 0, 0, 10]
                  break
              }
          }
        }
      } else {
        for (const op of line.ops) {
          const segment: any = {}

          // Segment styles
          if (typeof op.insert === 'string') {
            segment.text = op.insert
          } else if (op.insert.image && this.config.images) {
            block = this.newBlock('image')

            try {
              const imageDataUri = await this.dataUri(op.insert.image)

              block.image = imageDataUri
              block.fit = [500, 500]
            } catch (e) {
              console.error('Render PDF -> Error loading image:', e)
            }

            delete block.text

            block = this.newBlock()
          }

          // Block styles
          if (attributes.blockquote) {
            // Dialog
            segment.text = dialogType.transform(segment.text, this.config.dialogStyle)

            switch (this.config.characterDialogPositioning) {
              case CharacterDialogPositioning.Center:
                block.margin = [144, 0, 144, 10] // 2 inches from the left margin
                break
              case CharacterDialogPositioning.Dialog:
                block.margin = [100, 0, 0, 10]
                break
              case CharacterDialogPositioning.None:
                block.margin = [0, 0, 0, 10]
            }
          } else if (!inList) {
            // Other text

            if (!this.currentPageHeadingHasDescription && !this.currentPanelCount && line.ops.length === 1 && /^\([^()]*\)$/.test(segment.text)) {
              // If this is parenthesized text following a page heading ...

              // Use text as panel count on page heading
              this.setCurrentPagePanelCount(segment.text)

              // Prevent further insertion of panel count
              this.currentPageHeadingHasDescription = true

              // Don't print out this line; remove it from the docDefinition object
              this.docContent.pop()
              continue
            }

            block.margin = [0, 0, 0, 20]
          }

          if (op.attributes && op.attributes.bold) {
            segment.bold = true
          }

          if (op.attributes && op.attributes.italic) {
            segment.italics = true
          }

          if (op.attributes && op.attributes.underline) {
            segment.decoration = 'underline'
          }

          if (op.attributes && op.attributes.link) {
            segment.link = op.attributes.link
          }

          if (block.ol) {
            block.ol.push(segment)
          }

          if (block.text) {
            block.text.push(segment)

            if (this.currentPageHeading === block) {
              block.text.push(' (splash)')
            }
          }

          if (block.ul) {
            block.ul.push(segment)
          }
        }
      }

      if (block.text) {
        block.text.push({ text: '\n' })
      }
    }

    this.linesProcessing--
  }

  getBuffer(): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      const compiledPdf = await this.getCompiledPdf()

      compiledPdf.getBuffer((buffer) => {
        if (buffer) {
          resolve(buffer)
        } else {
          reject(new Error('Error while converting to buffer'))
        }
      })
    })
  }

  dataUri(url: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const image = new Image()
      const imagePath = path.join(this.tempDirectory, url)
      const ext = path.extname(imagePath).toLowerCase()

      const loadListener = () => {
        const canvas = document.createElement('canvas')
        canvas.width = image.width // or 'width' if you want a special/scaled size
        canvas.height = image.height // or 'height' if you want a special/scaled size
        canvas.getContext('2d')!.drawImage(image, 0, 0)

        switch (ext) {
          case '.jpeg':
          case '.jpg':
            resolve(canvas.toDataURL('image/jpeg'))
            break
          case '.png':
            resolve(canvas.toDataURL('image/png'))
            break
          default:
            reject(new Error(`${imagePath} could not be converted.Only JPEG and PNG are supported.`))
        }

        image.removeEventListener('load', loadListener)
      }

      const failListener = (error: ErrorEvent) => {
        image.removeEventListener('error', failListener)
        reject(error)
      }

      image.addEventListener('error', failListener)
      image.addEventListener('load', loadListener)
      image.src = imagePath
    })
  }
}
