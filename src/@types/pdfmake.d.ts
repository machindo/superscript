declare module 'pdfmake' {
  type headerFooterFunction = (currentPage: number, pageCount: number, pageSize: number) => string
  type blobCallback = (blob: Blob) => void
  type bufferCallback = (buffer: Buffer) => void
  type dataUrlCallback = (dataUrl: string) => void

  type PageSize = '4A0' | '2A0' | 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'A7' | 'A8' | 'A9' | 'A10' |
    'B0' | 'B1' | 'B2' | 'B3' | 'B4' | 'B5' | 'B6' | 'B7' | 'B8' | 'B9' | 'B10' |
    'C0' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7' | 'C8' | 'C9' | 'C10' |
    'RA0' | 'RA1' | 'RA2' | 'RA3' | 'RA4' |
    'SRA0' | 'SRA1' | 'SRA2' | 'SRA3' | 'SRA4' |
    'EXECUTIVE' | 'FOLIO' | 'LEGAL' | 'LETTER' | 'TABLOID'

  interface DocInfo {
    title?: string
    author?: string
    subject?: string
    keywords?: string
    creator?: string
    producer?: string
    creationDate?: string
    modDate?: string
    trapped?: string
    [key: string]: string
  }

  export interface DocDefinition {
    background?: string
    compress?: boolean
    content?: any
    defaultStyle?: any
    footer?: string | headerFooterFunction
    header?: string | headerFooterFunction
    info?: DocInfo
    pageSize?: PageSize | { width: number, height: number }
    pageOrientation?: 'landscape' | 'portrait'
    pageMargins?: number | [number, number] | [number, number, number, number]
    styles?: any
    title?: string
  }

  class PDF {
    // download() // Don't use in Electron
    // open() // Won't work in Electron
    // print() // Won't work in Electron
    getBlob(cb?: blobCallback): void
    getBuffer(cb?: bufferCallback): void
    getDataUrl(cb?: dataUrlCallback): void
  }

  interface PdfMake {
    createPdf(docDefinition: DocDefinition): PDF
    fonts: any
    vfs: any
  }

  const pdfMake: PdfMake

  export = pdfMake
}
