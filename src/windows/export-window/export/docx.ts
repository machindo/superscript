import * as docx from 'docx'
import fs from 'fs-extra'
import sizeOf from 'image-size'
import path from 'path'
import { DeltaStatic, StringMap } from 'quill'
import Delta from 'quill-delta'
import { Superscript } from 'windows/superscript'
import { CharacterDialogPositioning, CharacterHeadingStyle, DialogStyle, ExportSettings, PanelDescriptionPositioning, PanelHeadingStyle, PhysicalPageCount, TitleFormat } from 'windows/superscript.formatting'
import { characterHeadingType, pageHeadingType, panelHeadingType } from 'windows/superscript.types'

export class Docx {
  comicPageCount = 0
  doc: docx.Document
  frontmatter: { [key: string]: string | string[] } = {}
  orderedList: any
  unorderedList: any

  constructor(delta: DeltaStatic, private config: ExportSettings, private tempDirectory: string) {
    delta = new Delta(delta.ops)

    if (!this.config) {
      this.config = new ExportSettings()
    }

    // @ts-ignore differentFirstPageHeader is allowed but not in types yet
    this.doc = new docx.Document(undefined, { differentFirstPageHeader: this.config.titleFormat === TitleFormat.CoverPage })
    this.setupStyles()
    this.frontmatter = Superscript.parseFrontmatter(delta)

    if (this.config.titleFormat === TitleFormat.CoverPage) {
      this.addCoverPage()
    } else {
      this.addPageOneTitle()
    }

    this.transformLines(delta)
    this.addHeader()
    this.addFooter()
  }

  setupStyles() {
    this.doc.Styles.createParagraphStyle('Normal', 'Normal')
      .quickFormat()
      .font('Courier New')
      .size(this.config.fontSize * 2)
      .color('#000000')
      .spacing({ after: this.config.fontSize * 10 })
      .next('Normal')

    this.doc.Styles.createParagraphStyle('Title', 'Title')
      .quickFormat()
      .basedOn('Normal')
      .size(this.config.fontSize * 44 / 12)
      .bold()
      .next('Normal')

    this.doc.Styles.createParagraphStyle('Heading1', 'Page Heading')
      .quickFormat()
      .basedOn('Normal')
      .size(this.config.fontSize * 44 / 12)
      .allCaps()
      .bold()
      .underline()
      .next('Normal')

    this.doc.Styles.createParagraphStyle('Heading2', 'Panel Heading')
      .quickFormat()
      .basedOn('Normal')
      .bold()
      .next('Normal')

    this.doc.Styles.createParagraphStyle('Heading2', 'Heading 2')
      .quickFormat()
      .basedOn('Normal')
      .size(this.config.fontSize * 36 / 12)
      .bold()
      .next('Normal')

    this.doc.Styles.createParagraphStyle('Heading3', 'Heading 3')
      .quickFormat()
      .basedOn('Normal')
      .size(this.config.fontSize * 32 / 12)
      .bold()
      .next('Normal')

    this.doc.Styles.createParagraphStyle('Heading4', 'Heading 4')
      .quickFormat()
      .basedOn('Normal')
      .size(this.config.fontSize * 28 / 12)
      .bold()
      .next('Normal')

    this.doc.Styles.createParagraphStyle('Heading5', 'Heading 5')
      .quickFormat()
      .basedOn('Normal')
      .size(this.config.fontSize * 24 / 12)
      .bold()
      .next('Normal')

    this.doc.Styles.createParagraphStyle('Heading6', 'Heading 6')
      .quickFormat()
      .basedOn('Normal')
      .size(this.config.fontSize * 20 / 12)
      .bold()
      .next('Normal')

    switch (this.config.characterDialogPositioning) {
      case CharacterDialogPositioning.Center:
        // Using https://i.pinimg.com/originals/cf/b1/d7/cfb1d7b5dc4dc526b076ab0655a6d4d0.jpg as a template
        this.doc.Styles.createParagraphStyle('Heading3', 'Character Heading')
          .quickFormat()
          .indent({ start: 3600 }) // 2.5 inches from the left margin
          .basedOn('Normal')
          .allCaps()
          .next('Dialog')

        this.doc.Styles.createParagraphStyle('Dialog', 'Dialog')
          .quickFormat()
          .indent({ start: 2160, end: 2160 }) // 1.5 inches from the left and right margins
          .basedOn('Normal')
          .next('Heading3')
        break
      case CharacterDialogPositioning.Columns:
        this.doc.Styles.createParagraphStyle('CharacterDialog', 'Character and Dialog')
          .quickFormat()
          .indent({ start: 3000, hanging: 3000 })
          .basedOn('Normal')
          .next('CharacterDialog')
        break
      case CharacterDialogPositioning.Dialog:
        this.doc.Styles.createParagraphStyle('Heading3', 'Character Heading')
          .quickFormat()
          .basedOn('Normal')
          .allCaps()
          .next('Dialog')

        this.doc.Styles.createParagraphStyle('Dialog', 'Dialog')
          .quickFormat()
          .indent({ start: 1000 })
          .basedOn('Normal')
          .next('Heading3')
        break
      default:
        this.doc.Styles.createParagraphStyle('Heading3', 'Character Heading')
          .quickFormat()
          .basedOn('Normal')
          .allCaps()
          .next('Dialog')

        this.doc.Styles.createParagraphStyle('Dialog', 'Dialog')
          .quickFormat()
          .basedOn('Normal')
          .next('Heading3')
    }

    const abstractOrderedNum = this.doc.Numbering.createAbstractNumbering()
    abstractOrderedNum.createLevel(0, 'decimal', '%1.', 'start')
      .addParagraphProperty(new docx.Indent({ left: 720, hanging: 360 }))
    abstractOrderedNum.createLevel(1, 'lowerLetter', '%2.', 'start')
      .addParagraphProperty(new docx.Indent({ left: 1440, hanging: 360 }))
    abstractOrderedNum.createLevel(2, 'lowerRoman', '%3.', 'start')
      .addParagraphProperty(new docx.Indent({ left: 2160, hanging: 360 }))
    abstractOrderedNum.createLevel(3, 'decimal', '%4.', 'start')
      .addParagraphProperty(new docx.Indent({ left: 2880, hanging: 360 }))
    abstractOrderedNum.createLevel(4, 'lowerLetter', '%5.', 'start')
      .addParagraphProperty(new docx.Indent({ left: 3600, hanging: 360 }))

    this.orderedList = this.doc.Numbering.createConcreteNumbering(abstractOrderedNum)

    const abstractUnorderedNum = this.doc.Numbering.createAbstractNumbering()
    abstractUnorderedNum.createLevel(0, 'bullet', '\u25CF', 'start')
      .addParagraphProperty(new docx.Indent({ left: 720, hanging: 360 }))
    abstractUnorderedNum.createLevel(1, 'bullet', '\u25CF', 'start')
      .addParagraphProperty(new docx.Indent({ left: 1440, hanging: 360 }))
    abstractUnorderedNum.createLevel(2, 'bullet', '\u25CF', 'start')
      .addParagraphProperty(new docx.Indent({ left: 2160, hanging: 360 }))
    abstractUnorderedNum.createLevel(3, 'bullet', '\u25CF', 'start')
      .addParagraphProperty(new docx.Indent({ left: 2880, hanging: 360 }))
    abstractUnorderedNum.createLevel(4, 'bullet', '\u25CF', 'start')
      .addParagraphProperty(new docx.Indent({ left: 3600, hanging: 360 }))

    this.unorderedList = this.doc.Numbering.createConcreteNumbering(abstractUnorderedNum)
  }

  addCoverPage() {
    if (this.frontmatter.title) {
      const titleText = new docx.TextRun(this.frontmatter.title as string).bold().size(this.config.fontSize * 64 / 12)
      this.doc.createParagraph()
        .center()
        .spacing({ before: 5600 })
        .addRun(titleText)
    }

    if (this.frontmatter.writer) {
      this.doc.createParagraph(`by ${this.frontmatter.writer}`)
        .center()
        .spacing({ after: 480 })
    }

    if (this.frontmatter.volume) {
      this.doc.createParagraph(`Volume: ${this.frontmatter.volume}`).center()
    }

    if (this.frontmatter.issue) {
      this.doc.createParagraph(`Issue: ${this.frontmatter.issue}`).center()
    }

    this.doc.addParagraph(new docx.Paragraph().pageBreak())
  }

  addPageOneTitle() {
    if (this.frontmatter.title) {
      const titleText = new docx.TextRun(this.frontmatter.title as string).bold().size(this.config.fontSize * 36 / 12)
      this.doc.createParagraph().addRun(titleText)
    }

    if (this.frontmatter.writer) {
      this.doc.createParagraph(`by ${this.frontmatter.writer}`)
    }

    if (this.frontmatter.volume) {
      this.doc.createParagraph(`Volume: ${this.frontmatter.volume}`)
    }

    if (this.frontmatter.issue) {
      this.doc.createParagraph(`Issue: ${this.frontmatter.issue}`)
    }

    this.doc.addParagraph(new docx.Paragraph().spacing({ after: 100 }))
  }

  addHeader() {
    const headerTitle: string[] = []

    if (this.frontmatter.title) {
      headerTitle.push(this.frontmatter.title as string)
    }

    if (this.frontmatter.issue) {
      const issueText = /^\d+$/.test(this.frontmatter.issue as string) ? ` #${this.frontmatter.issue}` : `: ${this.frontmatter.issue}`
      headerTitle.push(issueText)
    }

    if (this.frontmatter.writer) {
      headerTitle.push(` by ${this.frontmatter.writer}`)
    }

    this.doc.Header.createParagraph(`${headerTitle.join('')} (${this.comicPageCount} page${this.comicPageCount === 1 ? '' : 's'}) `)
  }

  addFooter() {
    if (this.config.physicalPageCount !== PhysicalPageCount.None) {
      const footer = new docx.Paragraph().right()
      const num = new docx.TextRun('').pageNumber()
      footer.addRun(num)
      this.doc.Footer.addParagraph(footer)
    }
  }

  async transformLines(delta: DeltaStatic) {
    let currentPageHeading: docx.Paragraph
    let currentPageDescription: docx.Paragraph | undefined
    let currentPageHeadingHasDescription = false
    let currentPanelHeading: docx.Paragraph
    let currentPanelHeadingHasDescription = false
    let currentPanelCount = 0
    let currentCharacterCount = 0
    let previousParagraph: docx.Paragraph

    delta.eachLine((line: DeltaStatic, attributes: StringMap, _i: number) => {
      if (line.ops && !attributes.frontmatter) {
        let paragraph = new docx.Paragraph()

        if (attributes.header) {
          let lineText = ''
          let textRun: docx.TextRun

          for (const op of line.ops) {
            if (typeof op.insert === 'string') {
              lineText += op.insert
            }
          }

          if (lineText.startsWith('#')) {
            const headingLevel = lineText.match(/^#+/)![0].length
            // @ts-ignore
            paragraph[`heading${headingLevel}`]()
            textRun = new docx.TextRun(lineText.replace(/^#+\s+/, ''))
          } else {
            switch (attributes.header) {
              case 1:
                const pageNumberMatches = lineText.match(/\d+/g)!

                if (currentPageDescription && !currentPageHeadingHasDescription) {
                  currentPageDescription.addRun(
                    new docx.TextRun(currentPanelCount ? `(${currentPanelCount} panel${currentPanelCount > 1 ? 's' : ''})` : '(splash)')
                  )
                }

                if (pageNumberMatches) {
                  this.comicPageCount = parseInt(pageNumberMatches[pageNumberMatches.length - 1], 10)
                  lineText = pageHeadingType.transform(lineText, this.config.pageHeadingStyle)
                }

                // Only add page break if this is not the first page
                if (currentPageHeading) {
                  this.doc.addParagraph(new docx.Paragraph().pageBreak())
                }

                paragraph.heading1()
                currentPageHeading = paragraph
                currentPageHeadingHasDescription = false

                currentPageDescription = new docx.Paragraph()
                currentPanelCount = 0
                currentCharacterCount = 0

                textRun = new docx.TextRun(lineText)

                break
              case 2:
                if (this.config.panelDescriptionPositioning === PanelDescriptionPositioning.SeparateLines) {
                  paragraph.heading2()
                }
                currentPanelHeading = paragraph
                currentPanelHeadingHasDescription = false

                const panelNumberMatch = lineText.match(/\d+/g) as string[]
                lineText = panelHeadingType.transform(lineText, this.config.panelHeadingStyle)

                if (this.config.panelDescriptionPositioning === PanelDescriptionPositioning.SameLine) {
                  lineText += this.config.panelHeadingStyle === PanelHeadingStyle.PanelAndNumerals ? ': ' : ' '
                }

                textRun = new docx.TextRun(lineText).bold()
                currentPanelCount = parseInt(panelNumberMatch[panelNumberMatch.length - 1], 10)

                break
              case 3:
                if (this.config.characterDialogPositioning === CharacterDialogPositioning.Columns) {
                  paragraph.style('CharacterDialog')
                } else {
                  paragraph.heading3()
                }

                lineText = characterHeadingType.transform(lineText)

                if (this.config.characterHeadingStyle === CharacterHeadingStyle.NumeralAndName) {
                  lineText = `${++currentCharacterCount}. ${lineText}`
                }

                textRun = new docx.TextRun(lineText)

                break
              default:
                textRun = new docx.TextRun('')
            }
          }

          paragraph.addRun(textRun)
        } else {
          if (attributes.blockquote) {
            // Dialog
            if (previousParagraph && this.config.characterDialogPositioning === CharacterDialogPositioning.Columns) {
              paragraph = previousParagraph
            } else {
              paragraph.style('Dialog')
            }
          } else if (
            previousParagraph
            && !currentPageHeadingHasDescription
            && previousParagraph === currentPageHeading
            && line.ops.length
            && typeof line.ops[0].insert === 'string' && line.ops[0].insert.startsWith('(')
            && typeof line.ops[line.ops.length - 1].insert === 'string' && line.ops[line.ops.length - 1].insert.endsWith(')')
          ) {
            // Panel count replacement on new line
            paragraph = currentPageDescription!
            currentPageHeadingHasDescription = true
          } else if (
            previousParagraph
            && !currentPanelHeadingHasDescription
            && this.config.panelDescriptionPositioning === PanelDescriptionPositioning.SameLine
            && previousParagraph === currentPanelHeading
          ) {
            // Panel count replacement on same line as page heading
            paragraph = previousParagraph
            currentPanelHeadingHasDescription = true
          } else if (attributes.list === 'bullet') {
            // Unordered list
            paragraph.setNumbering(this.unorderedList, attributes.indent || 0)
          } else if (attributes.list === 'ordered') {
            // Ordered list
            paragraph.setNumbering(this.orderedList, attributes.indent || 0)
          }

          let opIndex = -1
          for (const op of line.ops) {
            opIndex++

            if (typeof op.insert === 'object' && typeof op.insert.image === 'string') {
              if (this.config.images) {
                const imagePath = path.join(this.tempDirectory, op.insert.image)
                const imageBuffer = fs.readFileSync(imagePath)
                const imageDimensions = sizeOf(imageBuffer)
                this.doc.createImage(imageBuffer, Math.min(400, imageDimensions.width), Math.min(600, imageDimensions.height))
              }
            } else {
              let text = op.insert
              let textRun: docx.TextRun

              if (opIndex === 0) {
                text = text.trimLeft()
              }

              textRun = new docx.TextRun(text)

              if (attributes.blockquote) {
                if (this.config.dialogStyle === DialogStyle.AllCaps) {
                  textRun.allCaps()
                }

                if (opIndex === 0 && this.config.characterDialogPositioning === CharacterDialogPositioning.Columns) {
                  textRun.tab()
                }
              }

              if (op.attributes && op.attributes.bold) {
                textRun.bold()
              }

              if (op.attributes && op.attributes.italic) {
                textRun.italic()
              }

              if (op.attributes && op.attributes.underline) {
                textRun.underline()
              }

              paragraph.addRun(textRun)
            }
          }
        }

        // Don't add the same paragraph twice
        if (previousParagraph !== paragraph && paragraph !== currentPageDescription) {
          this.doc.addParagraph(paragraph)
          previousParagraph = paragraph
        }

        // If we're on the current page heading, add the page description as well
        if (paragraph === currentPageHeading) {
          this.doc.addParagraph(currentPageDescription!)
        }
      }
    })

    // Add page description to the final page heading
    if (currentPageDescription && !currentPageHeadingHasDescription) {
      currentPageDescription.addRun(
        new docx.TextRun(currentPanelCount ? `(${currentPanelCount} panel${currentPanelCount > 1 ? 's' : ''})` : '(splash)')
      )
    }
  }

  async export(filename: string) {
    const packer = new docx.Packer()

    const buffer = await packer.toBuffer(this.doc)

    return fs.writeFile(filename, buffer)
  }
}
