export interface Structure {
  pages: StructurePage[]
}

export class StructureSection {
  index: number
  number = 0
  headingText: string
  wordCount = 0
}

export class StructurePage extends StructureSection {
  panels: StructurePanel[] = []
  scrollTop: number
  type = 'page'
}

export class StructurePanel extends StructureSection {
  characters: StructureSection[] = []
}
