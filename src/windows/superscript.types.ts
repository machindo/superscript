import numbered from 'numbered'
import { DeltaStatic, StringMap } from 'quill'
import Delta from 'quill-delta'
import urlRegex from 'url-regex'
import { CharacterHeadingStyle, DialogStyle, PageHeadingStyle, PanelHeadingStyle } from 'windows/superscript.formatting'

export enum TypeName {
  EmptyLine,
  SpecialHeading,
  Marker,
  PageHeading,
  PanelHeading,
  CharacterHeading,
  Dialog,
  Plain
}

export enum OperationMethod {
  Amend,
  Create
}

export interface StyleType {
  pattern: RegExp
  name: TypeName
  attributes: StringMap
  transform(text: string, style?: PageHeadingStyle | PanelHeadingStyle | CharacterHeadingStyle | DialogStyle, pageNumber?: number): string
}

export interface Piece {
  content: string | any
  index: number
  attributes: any
  delimiterLength: number
}

export const resetAttributes = {
  header: false,
  blockquote: false,
  frontmatter: false,
  count: false,
  spellcheck: false
}

export function inlineStylesDelta(text: string, method: OperationMethod, blockAttributes: any): DeltaStatic {
  const url = urlRegex()
  const pieces: Piece[] = []

  // Style links
  let match = url.exec(text)
  while (match) {
    const [annotatedText] = match
    const piece: Piece = { content: annotatedText, index: match.index, attributes: {}, delimiterLength: 0 }

    const link = /^https?:\/\//.test(annotatedText) ? annotatedText : `http://${annotatedText}`

    if (/\.(gif|jpeg|jpg|png|svg)$/.test(link)) {
      piece.content = { image: link }
      piece.attributes = { alt: link }
    } else {
      piece.attributes = { link, spellcheck: 'false' }
    }

    pieces.push(piece)
    match = url.exec(text)
  }

  pieces.sort((a, b) => a.index - b.index)

  const delta = new Delta()
  let lastIndex = 0

  for (const piece of pieces) {
    switch (method) {
      case OperationMethod.Amend:
        if (piece.content.image) {
          delta.retain(piece.index - lastIndex, blockAttributes)
          delta.delete(piece.content.image.length)
          delta.insert(piece.content, piece.attributes)
        } else {
          delta.retain(piece.index - lastIndex, blockAttributes)
          delta.retain(piece.content.length, { ...blockAttributes, ...piece.attributes })
        }
        break
      case OperationMethod.Create:
        if (piece.content.image) {
          delta.insert(piece.index - lastIndex, blockAttributes)
          delta.insert(piece.content, piece.attributes)
        } else {
          delta.insert(text.substring(lastIndex, piece.index), blockAttributes)
          delta.insert(piece.content, { ...blockAttributes, ...piece.attributes })
        }
    }

    lastIndex = piece.index + piece.content.length
  }

  if (method === OperationMethod.Create) {
    delta.insert(text.substring(lastIndex), blockAttributes)
  } else {
    delta.retain(text.length - lastIndex, blockAttributes)
  }

  return delta
}

export const emptyLineType: StyleType = {
  pattern: /^$/,
  name: TypeName.EmptyLine,
  attributes: {},
  transform: (text) => text
}

export const pageHeadingType: StyleType = {
  pattern: /^PAGES?\s*$|^PAGES?\s*\d+\-?\d*\s*\.?\s*$|^\d+\s*PAGES?\s*$/i,
  name: TypeName.PageHeading,
  attributes: { ...resetAttributes, header: 1 },
  transform(text: string, style = PageHeadingStyle.PageAndNumerals): string {
    const pageNumberMatches = text.match(/\d+/g) as string[]

    switch (style) {
      case PageHeadingStyle.Longhand:
        text = pageNumberMatches
          .map((n: string) => numbered(parseInt(n, 10)).toLocaleUpperCase())
          .join(' — ')
        break
      case PageHeadingStyle.PageAndLonghand:
        text = `PAGE${pageNumberMatches.length > 1 ? 'S' : ''} ` + pageNumberMatches
          .map((n: string) => numbered(parseInt(n, 10)).toLocaleUpperCase())
          .join(' — ')
        break
      case PageHeadingStyle.PageAndNumerals:
        text = `PAGE${pageNumberMatches.length > 1 ? 'S' : ''} ${pageNumberMatches.join('-')}`
        break
      case PageHeadingStyle.Numerals:
        text = pageNumberMatches.join('-')
    }

    return text
  }
}

export const panelHeadingType: StyleType = {
  pattern: /^Panels?\s*$|^Panels?\s*\d+\-?\d*\s*\.?\s*$|^\d+\s*Panels?\s*$/i,
  name: TypeName.PanelHeading,
  attributes: { ...resetAttributes, header: 2 },
  transform(text: string, style = PanelHeadingStyle.PanelAndNumerals, pageNumber = 1): string {
    const panelNumberMatch = text.match(/\d+/g) as string[]

    switch (style) {
      case PanelHeadingStyle.PanelAndNumerals:
        text = `Panel${panelNumberMatch.length > 1 ? 's' : ''} ${panelNumberMatch.join('-')}`
        break
      case PanelHeadingStyle.PanelAndNumeralsWithPage:
        text = `Panel${panelNumberMatch.length > 1 ? 's' : ''} ${pageNumber}.${panelNumberMatch.join('-')}`
        break
      case PanelHeadingStyle.NumeralAndDot:
        text = `${panelNumberMatch.join('-')}.`
        break
      case PanelHeadingStyle.NumeralWithPage:
        text = `${pageNumber}.${panelNumberMatch.join('-')}`
        break
      case PanelHeadingStyle.NumeralAndParenthesis:
        text = `${panelNumberMatch.join('-')})`
        break
    }

    return text
  }
}

export const characterHeadingType: StyleType = {
  pattern: /^(?:[^\s:][^\n:]*)?:+\s*(?:\(.*\)|\[.*\])?\s*$/,
  name: TypeName.CharacterHeading,
  attributes: { ...resetAttributes, header: 3 },
  transform: (text) => text.toLocaleUpperCase()
}

export const dialogType: StyleType = {
  pattern: /^(?:\s{2}|\t).*$/,
  name: TypeName.Dialog,
  attributes: { ...resetAttributes, blockquote: true },
  transform(text: string, style = DialogStyle.Normal): string {
    if (style === DialogStyle.AllCaps) {
      text = text.toLocaleUpperCase()
    }

    return text
  }
}

export const plainType: StyleType = {
  pattern: /^/, // Catch all
  name: TypeName.Plain,
  attributes: { header: false, blockquote: false },
  transform: (text) => text
}

export const specialHeadingType: StyleType = {
  pattern: /^(?:Characters|Notes|Outline|Summary)$/i,
  name: TypeName.SpecialHeading,
  attributes: { ...resetAttributes, header: 1 },
  transform: (text) => text.substr(0, 1).toLocaleUpperCase() + text.substr(1).toLocaleLowerCase()
}

export const markdownH1Type: StyleType = {
  pattern: /^#\s+[^\s]/,
  name: TypeName.Marker,
  attributes: { ...resetAttributes, header: 1, offpage: true },
  transform: (text) => text.substr(0, 1).toLocaleUpperCase() + text.substr(1)
}

export const markdownH2Type: StyleType = {
  pattern: /^#{2}\s+[^\s]+/,
  name: TypeName.Marker,
  attributes: { ...resetAttributes, header: 2, offpage: true },
  transform: (text) => text.substr(0, 1).toLocaleUpperCase() + text.substr(1)
}

export const markdownH3Type: StyleType = {
  pattern: /^#{3}\s+[^\s]+/,
  name: TypeName.Marker,
  attributes: { ...resetAttributes, header: 3, offpage: true },
  transform: (text) => text.substr(0, 1).toLocaleUpperCase() + text.substr(1)
}

export const markdownH4Type: StyleType = {
  pattern: /^#{4}\s+[^\s]+/,
  name: TypeName.Marker,
  attributes: { ...resetAttributes, header: 4, offpage: true },
  transform: (text) => text.substr(0, 1).toLocaleUpperCase() + text.substr(1)
}

export const markdownH5Type: StyleType = {
  pattern: /^#{5}\s+[^\s]+/,
  name: TypeName.Marker,
  attributes: { ...resetAttributes, header: 5, offpage: true },
  transform: (text) => text.substr(0, 1).toLocaleUpperCase() + text.substr(1)
}

export const markdownH6Type: StyleType = {
  pattern: /^#{6}\s+[^\s]+/,
  name: TypeName.Marker,
  attributes: { ...resetAttributes, header: 6, offpage: true },
  transform: (text) => text.substr(0, 1).toLocaleUpperCase() + text.substr(1)
}

export const markdownHRType: StyleType = {
  pattern: /^---+$|^\*\*\*+$|^___+$/,
  name: TypeName.Marker,
  attributes: { ...resetAttributes, header: 1, offpage: true },
  transform: (text) => text.substr(0, 1).toLocaleUpperCase() + text.substr(1)
}

export const types: StyleType[] = [
  emptyLineType,
  pageHeadingType,
  panelHeadingType,
  characterHeadingType,
  dialogType,
  plainType,
  specialHeadingType,
  markdownH1Type,
  markdownH2Type,
  markdownH3Type,
  markdownH4Type,
  markdownH5Type,
  markdownH6Type,
  markdownHRType
]

// page, panel, character, dialog
export const typeRegex = new RegExp(`(${pageHeadingType.pattern.source})|(${panelHeadingType.pattern.source})|(${characterHeadingType.pattern.source})|(${dialogType.pattern.source})|(${specialHeadingType.pattern.source})|(${markdownH6Type.pattern.source})|(${markdownH5Type.pattern.source})|(${markdownH4Type.pattern.source})|(${markdownH3Type.pattern.source})|(${markdownH2Type.pattern.source})|(${markdownH1Type.pattern.source})|(${markdownHRType.pattern.source})`, 'i')

export function typeForLine(text: string): StyleType {
  const match = typeRegex.exec(text)

  if (match && match[1]) {
    return pageHeadingType
  } else if (match && match[2]) {
    return panelHeadingType
  } else if (match && match[3]) {
    return characterHeadingType
  } else if (match && match[4]) {
    return dialogType
  } else {
    return plainType
  }
}

export interface SuperscriptCommentEntry {
  content: string
  user?: string
}

export interface SuperscriptComment {
  id: string
  entries: SuperscriptCommentEntry[]
  index: number
}
