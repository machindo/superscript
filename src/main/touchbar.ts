// istanbul ignore file

import { TouchBar } from 'electron'

import { Commands } from './commands'

const { TouchBarButton, TouchBarSpacer } = TouchBar

const wordCountButton = new TouchBarButton({
  label: 'Dialog Word Count',
  click: () => Commands.toggleWordCount()
})

const boldButton = new TouchBarButton({
  label: 'B',
  click: () => Commands.bold()
})

const italicButton = new TouchBarButton({
  label: 'I',
  click: () => Commands.italic()
})

const underlineButton = new TouchBarButton({
  label: 'U',
  click: () => Commands.underline()
})

const strikeButton = new TouchBarButton({
  label: 'S',
  click: () => Commands.strike()
})

const spacer = new TouchBarSpacer({ size: 'large' })

export const touchBar = new TouchBar({
  items: [
    wordCountButton,
    spacer,
    boldButton,
    italicButton,
    underlineButton,
    strikeButton
  ]
})
