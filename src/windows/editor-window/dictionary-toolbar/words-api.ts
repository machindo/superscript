export const wordDetails: string[] = [
  'synonyms',
  'antonyms',
  'examples',
  'typeOf',
  'hasTypes',
  'partOf',
  'hasParts',
  'instanceOf',
  'hasInstances',
  'similarTo',
  'also',
  'entails',
  'memberOf',
  'hasMembers',
  'substanceOf',
  'hasSubstances',
  'inCategory',
  'hasCategories',
  'usageOf',
  'hasUsages',
  'inRegion',
  'regionOf',
  'pertainsTo'
]

export interface WordResult {
  definition?: string
  partOfSpeech?: string
  synonyms?: string[]
  antonyms?: string[]
  examples?: string[]
  typeOf?: string[]
  hasTypes?: string[]
  partOf?: string[]
  hasParts?: string[]
  instanceOf?: string[]
  hasInstances?: string[]
  similarTo?: string[]
  also?: string[]
  entails?: string[]
  memberOf?: string[]
  hasMembers?: string[]
  substanceOf?: string[]
  hasSubstances?: string[]
  inCategory?: string[]
  hasCategories?: string[]
  usageOf?: string[]
  hasUsages?: string[]
  inRegion?: string[]
  regionOf?: string[]
  pertainsTo?: string[]
}
