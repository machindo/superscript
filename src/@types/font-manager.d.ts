declare module 'font-manager' {
  interface FontDescriptor {
    path: string
    postscriptName: string
    family: string
    style: string
    weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
    width: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
    italic: boolean
    monospace: boolean
  }

  export type PartialFontDescriptor = {
    [P in keyof FontDescriptor]?: FontDescriptor[P]
  }

  class FontManager {
    getAvailableFonts(callback: (fonts: FontDescriptor[]) => void)
    getAvailableFontsSync(): FontDescriptor[]
    findFonts(fontDescriptor: PartialFontDescriptor, callback: (fonts: FontDescriptor[]) => void): FontDescriptor[]
    findFontsSync(fontDescriptor: PartialFontDescriptor): FontDescriptor[]
    findFont(fontDescriptor: PartialFontDescriptor, callback: (font: FontDescriptor) => void)
    findFontSync(fontDescriptor: PartialFontDescriptor): FontDescriptor
    substituteFont(postscriptName: string, text: string, callback: (font: FontDescriptor) => void)
    substituteFontSync(postscriptName: string, text: string): FontDescriptor
  }

  const fontManager: FontManager

  export = fontManager
}
