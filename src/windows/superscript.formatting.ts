export enum ExportFileFormat {
  Docx,
  Markdown,
  Pdf,
  Richtext,
  Text
}

export enum PageSize {
  A3 = 'A3',
  A4 = 'A4',
  A5 = 'A5',
  B4 = 'B4',
  B5 = 'B5',
  B6 = 'B6',
  C4 = 'C4',
  C5 = 'C5',
  Executive = 'EXECUTIVE',
  Folio = 'FOLIO',
  Legal = 'LEGAL',
  Letter = 'LETTER',
  Tabloid = 'TABLOID'
}

export enum TitleFormat {
  CoverPage,
  PageOneHeader
}

export enum PageHeadingStyle {
  Longhand,
  PageAndLonghand,
  PageAndNumerals,
  Numerals
}

export enum PanelHeadingStyle {
  PanelAndNumerals,
  PanelAndNumeralsWithPage,
  NumeralAndDot,
  NumeralWithPage,
  NumeralAndParenthesis
}

export enum CharacterHeadingStyle {
  Name,
  NumeralAndName
}

export enum DialogStyle {
  Normal,
  AllCaps
}

export enum PanelDescriptionPositioning {
  SameLine,
  SeparateLines
}

export enum CharacterDialogPositioning {
  Center,
  Columns,
  Dialog,
  None
}

export enum PhysicalPageCount {
  None,
  Page,
  PageOfTotal
}

export class ExportSettings {
  characterDialogPositioning = CharacterDialogPositioning.Columns
  characterHeadingStyle = CharacterHeadingStyle.NumeralAndName
  dialogStyle = DialogStyle.Normal
  exportFileFormat = ExportFileFormat.Pdf
  fontFamily = 'Courier Prime Sans'
  fontSize = 12
  images = true
  outputExtraFrontmatter = false
  pageHeadingStyle = PageHeadingStyle.Longhand
  pageSize = PageSize.Letter
  panelDescriptionPositioning = PanelDescriptionPositioning.SameLine
  panelHeadingStyle = PanelHeadingStyle.PanelAndNumerals
  physicalPageCount = PhysicalPageCount.PageOfTotal
  titleFormat = TitleFormat.PageOneHeader
}
