import { DeltaStatic, StringMap } from 'quill'
import Delta from 'quill-delta'

import { markdownH1Type, markdownHRType, pageHeadingType, specialHeadingType } from './superscript.types'

export interface Attributes {
  $characters: string[]
  $vocabulary: string[]
  [key: string]: string | string[]
}

export const specialAttributes: ReadonlyArray<string> = [
  'address',
  'characters',
  'copyright',
  'draft',
  'email',
  'issue',
  'language',
  'series',
  'title',
  'vocabulary',
  'volume',
  'writer'
]

const firstHeadingRegex = new RegExp(`(?:${pageHeadingType.pattern.source})|(?:${specialHeadingType.pattern.source})|(?:${markdownH1Type.pattern.source})|(?:${markdownHRType.pattern.source})`, 'im')

export class Superscript {
  attributes: Attributes
  content: string
  frontmatter: string

  constructor(public raw: string) {
    [this.frontmatter, this.content] = Superscript.splitFrontmatter(raw)
    this.attributes = Superscript.parseFrontmatter(this.frontmatter)
  }

  static splitFrontmatter(raw: string): [string, string] {
    const frontmatterEnd = firstHeadingRegex.exec(raw)
    let frontmatter: any
    let content: string = ''

    if (frontmatterEnd) {
      frontmatter = raw.substr(0, frontmatterEnd.index)
      content = raw.substr(frontmatterEnd.index)
    } else {
      frontmatter = raw
    }

    return [frontmatter, content]
  }

  static parseFrontmatter(frontmatter: DeltaStatic | string): Attributes {
    if (typeof frontmatter === 'string') {
      return Superscript.parseFrontmatterFromString(frontmatter)
    } else {
      return Superscript.parseFrontmatterFromDelta(frontmatter)
    }
  }

  private static parseFrontmatterFromDelta(deltaStatic: DeltaStatic): Attributes {
    const delta = new Delta(deltaStatic.ops)
    let rawFrontmatter = ''

    delta.eachLine((line: DeltaStatic, attributes: StringMap, _i: number) => {
      if (line.ops && attributes.frontmatter) {
        for (const op of line.ops) {
          rawFrontmatter += op.insert + '\n'
        }
      }
    })

    return Superscript.parseFrontmatterFromString(rawFrontmatter)
  }

  private static parseFrontmatterFromString(frontmatter: string): Attributes {
    const attributes: Attributes = {
      $characters: [],
      $vocabulary: []
    }
    const unFormattedAttributes: { [key: string]: string | string[] } = {}
    const lines = frontmatter.split('\n')

    let lastKey: string | null = null

    // Use first line as the title
    attributes.title = lines.shift() as string

    for (const line of lines) {
      // If line starts with at least 2 spaces or a tab, append it to previous property
      if (/^( {2}|\t)\s*[^\s]/.test(line)) {
        if (lastKey && attributes[lastKey]) {
          attributes[lastKey] += '\n' + line.trim()
        } else if (lastKey) {
          attributes[lastKey] = line.trim()
        }

        continue
      }

      // Match key value pairs
      const keyValuePair = line.match(/^\s*(.+?)\s*:\s*(.*[^\s])?\s*$/)
      const writtenBy = line.match(/^(?:written )?by\s*(.*)$/i)

      if (keyValuePair) {
        let [{ }, key, value] = keyValuePair
        key = key.trim().toLowerCase()

        lastKey = key.trim()
        attributes[key.trim()] = value && value.trim()

        if (!specialAttributes.includes(key.trim())) {
          unFormattedAttributes[key.trim()] = attributes[key.trim()]
        }
      } else if (writtenBy) {
        // Recognize 'Written by ...' as a defining the writer
        [{}, attributes.writer] = writtenBy
        lastKey = 'writer'
      }

      if (typeof attributes.characters === 'string') {
        attributes.$characters = attributes.characters.split(/,|\n/).map((name: string) => name.trim())
      }

      if (typeof attributes.vocabulary === 'string') {
        attributes.$vocabulary = attributes.vocabulary.split(/,|\n/).map((name: string) => name.trim())
      }

      if (typeof attributes.language === 'string') {
        const localeMatches = attributes.language.match(/[a-z]{2,3}(?:-[a-z0-9]{2,3})?(?=\s|$|\()/i)

        if (localeMatches) {
          const localePart = localeMatches[0]
          attributes.language = localePart
        }
      }
    }

    return attributes
  }
}
