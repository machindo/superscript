import { autobind } from 'core-decorators'
import console from 'electron-log'
import debounce from 'lodash-decorators/debounce'
import delay from 'lodash-decorators/delay'
import { default as Quill, DeltaStatic, RangeStatic } from 'quill'
import Delta from 'quill-delta'
import scrollIntoView from 'scroll-into-view-if-needed'
import { FloatingMenu } from 'windows/editor-window/floating-menu/floating-menu'
import locales from 'windows/locales.json'
import { specialAttributes, Superscript } from 'windows/superscript'
import { characterHeadingType, dialogType, markdownH1Type, markdownH2Type, markdownH3Type, markdownH4Type, markdownH5Type, markdownH6Type, markdownHRType, pageHeadingType, panelHeadingType, plainType, resetAttributes, specialHeadingType, StyleType, TypeName, typeRegex } from 'windows/superscript.types'

import { renderer } from '../renderer'

import './superscript.parchment'
import { Structure, StructurePage, StructurePanel, StructureSection } from './superscript.structure'

const firstHeadingRegex = new RegExp(`^P$|${pageHeadingType.pattern.source}|${panelHeadingType.pattern.source}|${specialHeadingType.pattern.source}|(?:${markdownH1Type.pattern.source})|^---$`, 'im')
const pageOrPanelHeadingRegex = new RegExp(`${pageHeadingType.pattern.source}|${panelHeadingType.pattern.source}`, 'i')
const minimumAutocompleteWordLength = 2

function getWordAt(text: string, cursorIndex: number): { word: string, range: RangeStatic } {
  // Search for the word's beginning and end.
  const index = text.slice(0, cursorIndex).search(/\w+$/)
  let end = text.slice(cursorIndex).search(/[\W]/)

  // The last word in the string is a special case.
  if (end < 0) {
    end = 0
  }

  const length = cursorIndex + end - index

  const word = text.substr(index, length)
  return {
    word,
    range: { index, length }
  }
}

@autobind
export class SuperscriptAsYouType {
  quill: Quill
  options: any
  changedHeader = false
  hasChanged = false
  menu: FloatingMenu = new FloatingMenu()
  structure: Structure = { pages: [] }

  constructor(quill: Quill, options: any) {
    this.quill = quill
    this.options = options

    // Apply word counts and number headings on load
    this.quill.once('editor-change', () => {
      this.restyle()
    })

    // Refresh header numbers when moving off a header line or former header line
    this.quill.on('selection-change', (range) => this.onSelectionChange(range))

    // Handler that looks for insert deltas that match specific characters
    this.quill.on('text-change', (delta: Delta, oldContents: Delta, source: string) => this.onTextChange(delta, oldContents, source))
  }

  @debounce(20, { leading: true })
  @delay(0)
  async restyle() {
    const start = performance.now()
    const contents = this.quill.getContents()
    const structure: Structure = { pages: [] }
    const characterNames = new Set<string>()

    let currentPage = new StructurePage()
    let currentPanel = new StructurePanel()
    let currentCharacter = new StructureSection()
    let delta = new Delta()
    const headings: StructureSection[] = []
    let isFrontmatter = true
    let index = 0
    let offpage = false

    contents.eachLine((line, attributes, _i) => {
      if (line.ops!.length) {
        const lineText = line.ops!.reduce((text, op) => text + (typeof op.insert === 'string' ? op.insert : '|'), '')

        isFrontmatter = isFrontmatter && !firstHeadingRegex.test(lineText)

        if (isFrontmatter) {
          // Frontmatter
          delta.retain(lineText.length + 1, attributes.frontmatter ? {} : { frontmatter: true, blockquote: false, header: false, panelCount: false, wordCount: false })
          index += lineText.length + 1
        } else {
          const matches = lineText.match(typeRegex)

          let newText = lineText
          let type: StyleType

          if (attributes.list) {
            // Don't do any special stuff if we're in a list
            type = plainType
          } else if (lineText === 'P' || matches && matches[1]) {
            // Page heading
            const headingFormat = this.formatHeadingNumber(TypeName.PageHeading, lineText, Math.floor(currentPage.number) + 1)

            currentPage = {
              index,
              number: headingFormat.headingNumber,
              headingText: headingFormat.headingText,
              wordCount: 0,
              panels: [],
              scrollTop: 0,
              type: 'page'
            }

            this.applyScrollTopToPage(currentPage, index)

            structure.pages.push(currentPage)
            headings.push(currentPage)

            newText = headingFormat.headingText
            offpage = false
            currentPanel = new StructurePanel()
            type = pageHeadingType
          } else if (!offpage && lineText === 'p' || matches && matches[2]) {
            // Panel heading
            const headingFormat = this.formatHeadingNumber(TypeName.PanelHeading, lineText, currentPanel.number + 1)

            currentPanel = {
              index,
              number: headingFormat.headingNumber,
              headingText: headingFormat.headingText,
              wordCount: 0,
              characters: []
            }

            currentPage.panels.push(currentPanel)
            headings.push(currentPanel)

            currentCharacter = new StructureSection()
            newText = headingFormat.headingText
            type = panelHeadingType
          } else if (!offpage && matches && matches[3]) {
            // Character heading
            let [{ }, characterName, colons, parenthetical] = lineText.match(/(.*?)(:+)\s*(.*)/)!

            // Shortcut:
            // : means "use most recent character name"
            // :: means "use the character name before that"
            // and so on
            if (!characterName && characterNames.size >= colons.length) {
              const selection = this.quill.getSelection()

              // Do not use character name shortcut if cursor is postioned just before the colon
              // Hitting [enter] here: JUSTIN|: should allow the user to type in a name and not fill it automatically
              // Also fixes copy & paste issue
              if (!selection || selection.index !== index) {
                characterName = Array.from(characterNames)[characterNames.size - colons.length]
              }
            } else if (!characterNames.size || (characterName.toLowerCase() !== Array.from(characterNames)[characterNames.size - 1].toLowerCase())) {
              // If Character name is not the most recently used, push it onto the end of characterNames
              // Delete the the character name from the list first, so that add will add onto the end
              characterNames.delete(characterName)
              characterNames.add(characterName)
            }

            // Only treat as character heading if character name is set
            if (characterName) {
              newText = `${characterName}:${parenthetical ? ` ${parenthetical}` : ''}`

              currentCharacter = {
                index,
                number: currentCharacter.number + 1,
                headingText: newText,
                wordCount: 0
              }

              currentPanel.characters.push(currentCharacter)
              headings.push(currentCharacter)

              type = characterHeadingType
            } else {
              type = plainType
            }
          } else if (!offpage && matches && matches[4]) {
            // Dialog
            const wordCount = (lineText.match(/\b\S+\b/g) || []).length

            currentPage.wordCount += wordCount
            currentPanel.wordCount += wordCount
            currentCharacter.wordCount += wordCount

            type = dialogType
          } else if (matches && matches[5]) {
            // Characters, Outline, Summary
            type = specialHeadingType
            newText = type.transform(lineText)
            offpage = true

            currentPage = {
              index,
              number: currentPage.number + 0.1,
              headingText: newText,
              wordCount: 0,
              panels: [],
              scrollTop: 0,
              type: 'offpage'
            }

            this.applyScrollTopToPage(currentPage, index)

            structure.pages.push(currentPage)
            currentPanel = new StructurePanel()
          } else if (offpage && matches && matches[6]) {
            type = markdownH6Type
          } else if (offpage && matches && matches[7]) {
            type = markdownH5Type
          } else if (offpage && matches && matches[8]) {
            type = markdownH4Type
          } else if (offpage && matches && matches[9]) {
            type = markdownH3Type
          } else if (offpage && matches && matches[10]) {
            type = markdownH2Type
          } else if (matches && matches[11]) {
            // Act heading, Characters, Outline, Summary
            offpage = true
            type = markdownH1Type
            newText = type.transform(lineText)

            currentPage = {
              index,
              number: currentPage.number + 0.1,
              headingText: newText,
              wordCount: 0,
              panels: [],
              scrollTop: 0,
              type: 'offpage'
            }

            this.applyScrollTopToPage(currentPage, index)

            structure.pages.push(currentPage)
            currentPanel = new StructurePanel()
          } else if (matches && matches[12]) {
            // Page break
            offpage = true
            type = markdownHRType
            newText = type.transform(lineText)

            currentPage = {
              index,
              number: currentPage.number + 0.1,
              headingText: newText,
              wordCount: 0,
              panels: [],
              scrollTop: 0,
              type: 'offpage'
            }

            this.applyScrollTopToPage(currentPage, index)

            structure.pages.push(currentPage)
            currentPanel = new StructurePanel()
          } else {
            type = plainType
          }

          if (newText !== lineText) { // Text change
            delta.insert(`${newText}\n`, { header: type.attributes.header, blockquote: false, panelCount: false, wordCount: false, frontmatter: false, offpage: offpage })
            delta.delete(lineText.length + 1)
          } else if ((type.attributes.header || 0) !== (attributes.header || 0)) { // Heading level change
            delta.retain(lineText.length + 1, { header: type.attributes.header, blockquote: false, panelCount: false, wordCount: false, frontmatter: false, offpage: offpage })
          } else if (!type.attributes.blockquote !== !attributes.blockquote) { // Dialog change
            delta.retain(lineText.length + 1, { blockquote: type.attributes.blockquote, header: false, panelCount: false, wordCount: false, frontmatter: false, offpage: offpage })
          } else if (!offpage !== !(attributes.offpage && JSON.parse(attributes.offpage))) { // Off page change
            delta.retain(lineText.length + 1, { offpage: offpage, frontmatter: false })
          } else if (!type.attributes.header && (attributes.panelCount || attributes.wordCount)) { // Heading removed, remove panel and word counts as well
            delta.retain(lineText.length + 1, { panelCount: false, wordCount: false, frontmatter: false, offpage: offpage })
          } else if (attributes.frontmatter) { // Frontmatter change
            delta.retain(lineText.length + 1, { frontmatter: false, offpage: offpage })
          } else { // No change
            delta.retain(lineText.length + 1)
          }

          index += lineText.length + 1
        }
      } else {
        if (isFrontmatter !== !!(attributes.frontmatter && JSON.parse(attributes.frontmatter)) || offpage !== attributes.offpage) {
          // Frontmatter
          delta.retain(1, { frontmatter: isFrontmatter, offpage, blockquote: false, header: false, count: false })
        } else if (attributes.header || attributes.blockquote || attributes.count) {
          delta.retain(1, { header: false, blockquote: false, count: false })
        } else {
          delta.retain(1)
        }

        index++
      }
    })

    this.structure = structure
    delta = delta.compose(this.getPanelCountDelta(structure.pages))
    delta = delta.compose(this.getWordCountDelta(headings))

    if (delta.ops && delta.ops.length > 1) {
      this.quill.updateContents(delta, 'user')
    }

    console.info(`Restyled document in ${performance.now() - start} ms`)
  }

  @delay(50)
  async applyScrollTopToPage(page: StructurePage, index: number) {
    page.scrollTop = this.quill.getBounds(index).top
  }

  @debounce(20)
  onSelectionChange(range: RangeStatic) {
    if (this.hasChanged) {
      this.hasChanged = false
      this.restyle()
    }

    this.autocomplete(range)
  }

  @debounce(20, { leading: true })
  onTextChange(delta: Delta, _oldContents: Delta, source: string) {
    // Scroll line into view
    if (source === 'user') {
      this.scrollLineIntoView()
    }

    if (this.quill.getModule('history').ignoreChange) {
      this.hasChanged = false
      return
    }

    if (delta.ops && delta.ops.some(op => /\n/.test(op.insert))) {
      // If starting a new line after a character heading, start the new line with 2 spaces
      this.insertSpacesForDialog()

      // If user hit [enter], restyle right away
      this.restyle()
    } else if (delta.ops && delta.ops.length > 1) {
      // If ops length === 1, then either nothing has changed or everything has been deleted
      // Either way, no need to restyle everything
      this.hasChanged = true
    }

    setTimeout(() => this.autocomplete(this.quill.getSelection()))
  }

  @delay(0)
  scrollLineIntoView() {
    const selection = this.quill.getSelection()

    if (selection) {
      const [line] = this.quill.getLine(selection.index)

      scrollIntoView(line.domNode, {
        boundary: renderer.ui.$refs.editorPane.$el,
        behavior: 'auto',
        block: 'end',
        scrollMode: 'if-needed'
      })
    }
  }

  insertSpacesForDialog() {
    if (!this.quill.hasFocus()) {
      return
    }

    const { index } = this.quill.getSelection()!
    const isCharacterHeading = !this.quill.getLine(index)[0].attributes.attributes.offpage && characterHeadingType.pattern.test(this.quill.getLine(index)[0].domNode.innerText)

    if (isCharacterHeading) {
      // Hide caret while performing operation
      // @ts-ignore caretColor does exist on style object
      renderer.ui.$refs.editorPane.$el.style.caretColor = 'transparent'

      setTimeout(() => {
        this.quill.insertText(index + 1, '  ', { ...resetAttributes }, 'user')
        this.quill.setSelection(index + 3, 0)
        // @ts-ignore caretColor does exist on style object
        renderer.ui.$refs.editorPane.$el.style.caretColor = 'var(--caret-color)'
      })
    }
  }

  autocomplete(range: RangeStatic | null) {
    if (!range || range.length) {
      return
    }

    this.menu.reset()
    const frontmatter = this.splitFrontmatter()
    const [line, offset] = this.quill.getLine(range.index)
    const currentWord = getWordAt(line.domNode.textContent, offset)
    const word = currentWord.word.toLowerCase()
    const lineIndex = range.index - offset
    const atBeginning = currentWord.range.index === 0
    const bounds = this.quill.getBounds(range.index)

    this.menu.position.top = bounds.top
    this.menu.position.left = bounds.left

    const attributes = Superscript.parseFrontmatter(frontmatter.text)

    if (lineIndex === 0) {
      // If first line
      return
    } else if (frontmatter.firstHeadingIndex === -1 || range.index - 1 <= frontmatter.firstHeadingIndex) {
      // Frontmatter
      if (line.domNode.textContent.length && atBeginning) {
        // Select first item
        this.menu.hoveredIndex = 0

        // Show all matching attributes that aren't already used
        for (const attr of specialAttributes) {
          if (!attributes[attr] && attr.startsWith(word)) {
            this.menu.items.push({
              label: attr,
              click: () => {
                const delta = new Delta()
                  .retain(lineIndex + currentWord.range.index)
                  .insert(attr)
                  .delete(currentWord.range.length)

                // If current word isn't followed by a colon, insert one, followed by a space
                if (line.domNode.textContent.substr(currentWord.range.index + currentWord.range.length, 1) !== ':') {
                  delta.insert(': ')
                }

                setTimeout(() => {
                  this.quill.updateContents(delta, 'user')
                  this.quill.setSelection({ index: lineIndex + currentWord.range.index + attr.length + 2, length: 0 })
                }, 50)
              }
            })
          }
        }

        if ('page'.startsWith(word)) {
          this.menu.items.push({
            label: 'PAGE',
            bold: true,
            click: () => {
              const delta = new Delta()
                .retain(lineIndex + currentWord.range.index)
                .insert('PAGE\n')
                .delete(currentWord.range.length)

              setTimeout(() => {
                this.quill.updateContents(delta, 'user')
                this.quill.setSelection({ index: lineIndex + currentWord.range.index + 5, length: 0 })
              }, 50)
            }
          })
        }

        if ('panel'.startsWith(word)) {
          this.menu.items.push({
            label: 'Panel',
            bold: true,
            click: () => {
              const delta = new Delta()
                .retain(lineIndex + currentWord.range.index)
                .insert('Panel\n')
                .delete(currentWord.range.length)

              setTimeout(() => {
                this.quill.updateContents(delta, 'user')
                this.quill.setSelection({ index: lineIndex + currentWord.range.index + 6, length: 0 })
              }, 50)
            }
          })
        }
      } else if (!line.domNode.textContent.length) {
        // Empty line; show all available options
        // Show all attributes that aren't already used
        for (const attr of specialAttributes) {
          if (!attributes[attr]) {
            this.menu.items.push({
              label: attr,
              click: () => {
                const delta = new Delta()
                  .retain(range.index)
                  .insert(attr + ': ')

                this.quill.updateContents(delta, 'user')
                this.quill.setSelection({ index: range.index + attr.length + 2, length: 0 })
              }
            })
          }
        }

        this.menu.items.push({
          label: 'PAGE',
          bold: true,
          click: () => {
            this.quill.insertText(range.index, 'PAGE\n', 'user')
            this.quill.setSelection({ index: range.index + 5, length: 0 })
          }
        })

        this.menu.items.push({
          label: 'Panel',
          bold: true,
          click: () => {
            this.quill.insertText(range.index, 'Panel\n', 'user')
            this.quill.setSelection({ index: range.index + 6, length: 0 })
          }
        })
      } else if (/^language:/.test(line.domNode.textContent)) {
        // Show all options for language attribute
        const term = line.domNode.textContent.substr(9, line.domNode.textContent.length).trim()

        this.menu.items.push(...locales
          .filter(locale => locale.key.toLocaleLowerCase().includes(term.toLocaleLowerCase()) || locale.name.toLocaleLowerCase().includes(term.toLocaleLowerCase()))
          .map(locale => ({
            label: `${locale.key} (${locale.name})`,
            click: () => {
              const newLineText = `language: ${locale.key} (${locale.name})`
              const delta = new Delta()
                .retain(lineIndex)
                .insert(newLineText)
                .delete(line.domNode.textContent.length)

              setTimeout(() => {
                this.quill.updateContents(delta, 'user')
                this.quill.setSelection({ index: lineIndex + newLineText.length, length: 0 })
              }, 50)
            }
          })))
      }

      if (this.menu.items.length) {
        this.menu.hoveredIndex = 0
        this.menu.show()
      }
    } else if (!pageOrPanelHeadingRegex.test(line.domNode.textContent)) {
      if (!line.domNode.textContent.length) {
        // Empty line

        this.menu.items.push({
          label: 'PAGE',
          bold: true,
          click: () => {
            this.quill.insertText(range.index, 'PAGE\n', 'user')
            this.quill.setSelection({ index: range.index + 5, length: 0 })
          }
        })

        this.menu.items.push({
          label: 'Panel',
          bold: true,
          click: () => {
            this.quill.insertText(range.index, 'Panel\n', 'user')
            this.quill.setSelection({ index: range.index + 6, length: 0 })
          }
        })
      }

      const currentWordStartIndex = currentWord.range.index > -1 ? lineIndex + currentWord.range.index : range.index
      const currentWordLength = currentWord.range.index > -1 ? currentWord.range.length : 0

      // Characters and terms
      for (const word of [...attributes.$characters, ...attributes.$vocabulary]) {
        if (currentWord.range.index === -1 || (currentWordLength < word.length && word.toLocaleLowerCase().startsWith(currentWord.word.toLocaleLowerCase()))) {
          let replacement = word

          // Replace with all-caps if input is in all-caps
          // Capitalize first letter if input's first letter is capitalized
          if (/^[A-Z]{2,}$/.test(currentWord.word)) {
            replacement = word.toLocaleUpperCase()
          } else if (/^[A-Z]/.test(currentWord.word)) {
            replacement = word[0].toLocaleUpperCase() + word.substr(1)
          }

          // Match the beginning of the completion, but not the whole completion
          this.menu.items.push({
            label: replacement,
            click: () => {
              const delta = new Delta()
                .retain(currentWordStartIndex)
                .insert(replacement)
                .delete(currentWordLength)

              this.quill.updateContents(delta, 'user')
              this.quill.setSelection({ index: currentWordStartIndex + word.length, length: 0 })
            }
          })
        }
      }

      if (currentWord.word.length >= minimumAutocompleteWordLength && this.menu.items.length) {
        this.menu.hoveredIndex = 0
        this.menu.show()
      }
    }
  }

  splitFrontmatter(): { firstHeadingIndex: number, delta: DeltaStatic, text: string } {
    const delta = new Delta()
    const text = this.quill.getText()
    const firstHeading = firstHeadingRegex.exec(text)

    if (firstHeading) {
      delta
        .retain(firstHeading.index, { ...resetAttributes, frontmatter: true })
        .retain(this.quill.getLength(), { frontmatter: false })

      return { firstHeadingIndex: firstHeading.index, delta, text: text.substr(0, firstHeading.index) }
    } else {
      delta.retain(this.quill.getLength(), { ...resetAttributes, frontmatter: true })
    }

    return { firstHeadingIndex: -1, delta, text }
  }

  getPanelCountDelta(headings: StructurePage[]): Delta {
    const delta = new Delta()
    let lastIndex = 0

    // For each page, panel and character heading, compare latest tallied panel count with current attributes
    // Only apply new panel count if there's a change
    for (const heading of headings) {
      if (heading.panels) {
        const panelCount = parseInt(this.quill.getFormat(heading.index).panelCount, 10) || 0

        delta
          .retain(heading.index - lastIndex)
          .retain(heading.headingText.length + 1, { panelCount: heading.panels.length })

        lastIndex = heading.index + heading.headingText.length + 1
      }
    }

    return delta
  }

  getWordCountDelta(headings: StructureSection[]): Delta {
    const delta = new Delta()
    let lastIndex = 0

    // For each page, panel and character heading, compare latest tallied word count with current attributes
    // Only apply new word count if there's a change
    for (const heading of headings) {
      const wordCount = parseInt(this.quill.getFormat(heading.index).wordCount, 10) || 0

      delta
        .retain(heading.index - lastIndex)
        .retain(heading.headingText.length + 1, { wordCount: heading.wordCount })

      lastIndex = heading.index + heading.headingText.length + 1
    }

    return delta
  }

  formatHeadingNumber(typeName: TypeName, text: string, headingNumber: number): { headingNumber: number, headingText: string } {
    const startingTextSingular = typeName === TypeName.PageHeading ? 'PAGE' : 'Panel'
    const startingTextPlural = typeName === TypeName.PageHeading ? 'PAGES' : 'Panels'

    let newNumber = headingNumber
    let newText: string

    if (/\.$/.test(text)) {
      // Keep user-inputted number if line ends in a period
      // Match the last number in a range
      const numberMatch = text.match(/\d+(?!.*\d)/)

      if (numberMatch) {
        newNumber = parseInt(numberMatch[0], 10)
      }

      // Trim user-inputted text
      if (typeName === TypeName.PageHeading) {
        newText = text.trim().toLocaleUpperCase()
      } else {
        newText = text.trim()
      }
    } else if (/^[^\d]+(\d+\-\d+)[^\d]*$/.test(text)) {
      // Calculate heading range if line contains a dash
      // Match each number in the range
      const numberMatches = text.match(/\d+/g)

      const num0 = parseInt(numberMatches![0], 10)
      const num1 = parseInt(numberMatches![1], 10)
      const range = num1 - num0

      newNumber = headingNumber + range

      newText = `${startingTextPlural} ${headingNumber}-${newNumber}`
    } else if (/^\d/.test(text)) {
      // Calculate heading range if the text begins with a number
      const numberMatches = text.match(/\d+/g)
      const range = parseInt(numberMatches![0], 10) - 1

      if (range > 0) {
        newNumber = headingNumber + range
        newText = `${startingTextPlural} ${headingNumber}-${newNumber}`
      } else {
        newText = `${startingTextSingular} ${headingNumber}`
      }
    } else {
      // Insert heading number
      newText = `${startingTextSingular} ${headingNumber}`
    }

    return {
      headingNumber: newNumber,
      headingText: newText
    }
  }

  setFloatingMenu(menu: FloatingMenu) {
    this.menu = menu
  }

  appendFrontmatterValue(key: string, word: string) {
    const frontmatter = this.splitFrontmatter()

    let foundKey = false
    let index = -1
    let newKeyIndex = -1
    let valueIsEmpty = false

    // Loop through lines to get the index of the last line defining values for the given key
    this.quill.getContents(0, frontmatter.firstHeadingIndex).eachLine((line) => {
      const lineText = line.ops!.reduce((text, op) => text + (typeof op.insert === 'string' ? op.insert : '|'), '')
      const lineParts = lineText.match(/^([^\s]+):\s*(.*)$/)

      if (lineParts) {
        // This line defines a key
        if (foundKey) {
          // This line starts the given key
          return
        } else if (lineParts[1] === key) {
          // This line defines the key we want
          foundKey = true
          valueIsEmpty = !lineParts[2]
        }
      } else if (/^\s+[^\s]+/.test(lineText)) {
        // This line only defined values for the previous key
        valueIsEmpty = false
      } else if (foundKey) {
        return
      }

      index += line.length() + 1

      // In case key is not found, insert new key after last non-blank line
      if (line.length()) {
        newKeyIndex = index
      }
    })

    if (foundKey) {
      this.quill.insertText(index, `${valueIsEmpty ? '' : ','} ${word}`)
    } else {
      this.quill.insertText(newKeyIndex, `\n${key}: ${word}`)
    }
  }
}
