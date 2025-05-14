# Superscript

Superscript is a text editor build solely for writing for comic books and graphic novels.

# Automatic formatting

## Title

The first line of the document is assumed to be the title and set large and bold.

## Frontmatter

Everything between the title and the first page heading is considered frontmatter. See
[Using frontmatter](#using-frontmatter) below for more info.

## Page heading

Lines containing just `PAGE` or `PAGES`, followed by a number or a range of numbers,
are treated as page headings. These headings are automatically set in large, bold
all-caps and given a page break. See [Automatic numbering](#automatic-numbering) below
for more info.

When you print or export your script, page headings will be converted to words to follow
convention. E.g, `PAGE 12` in Superscript will become `TWELVE` in PDF.

```
PAGE 1

PAGE 2

PAGES 3-4
```

## Panel heading

Lines containing just `Panel` or `Panels`, followed by a number or a range of numbers,
are treated as panel headings. See [Automatic numbering](#automatic-numbering) below for
more info.

```
PAGE 1

Panel 1

Panels 2-5

Panel 6


PAGE 2

Panel 1

Panel 2
```

## Character heading

Lines ending in a colon (`:`) are treated as character headings and automatically set in
all-caps. Parenthesized (`(WHISPERING)`) or bracketed (`[WHISPERING]`) words may appear
after the colon. Anything else after the colon will make the line treated as plain
descriptive text.

```
[CAPTION]:
  New York, 1954

[SFX]:
  CRASH!

MAN TRAPPED UNDER A FALLEN TELEPHONE POLE: (SHOUTING)
  Heeeellllp!!!

HERO:
  Have no need to fear!

Hero's POV: a sign that reads "This is not a character heading".
```

`HERO:` is automatically set in all-caps and followed by indented dialog.

## Dialog

Lines indented with two spaces or a tab are treated as dialog. This also includes titles,
captions, sounds effect and narration.

```
HERO:
  Have no need to fear!
```

## Descriptive and action text

All other text is considered descriptive text and left unstyled.

```
With her cape flapping in the wind, she stands atop the skyscraper, surveying the rotting city below.
```

# Automatic numbering

Page and panel headings are automatically numbered for your convenience. Adding or removing
page or panel headings will automatically recalculate the heading numbers following them.

- Insert a page: `page` becomes "PAGE 1". The next `page` will become "PAGE 2" and so on.
- Insert a range of pages: `5 pages` becomes "PAGES 2-6".
- `pages 5-9` will automatically be renumbered when you add or remove pages before it,
  keeping the same range between the numbers.

Page and panel ranges are great for writing splash pages, panel sequences and for writing
outlines early on in the script.

The same shortcuts work for `panel` as well. Panel headings will begin with "1" at the start
of each page.

## Line-by-line example:

```
page        ➝    PAGE 1

panel       ➝    Panel 1
panel       ➝    Panel 2
4 panels    ➝    Panels 3-6
panel       ➝    Panel 7

2page       ➝    PAGES 2-3

panel       ➝    Panel 1
panel       ➝    Panel 2
```

# Using frontmatter

- Everything above the first page of the document is frontmatter, metadata containing title,
  author, issue #, contact info, etc.
- The first line of the document is assumed to be the title. Short for `title: My Comic`.
- `Written by JP Silva` or simply `by JP Silva` is a shortcut for `writer: JP Silva`
- Values can be entered right after the key or on indented on the following lines.
- You can see what variables are available by holding down the [alt] key on a blank line

Example:

```
Justin Wrote a Comic Book
by Justin Silva

issue: 1
phone: 617-555-0100
address:
  100 Food Court
  Lexicon, MO 12345
```

All the variable keys that can be set in Frontmatter:

- address
- characters (see [Spell check and autocomplete](#spell-check-and-autocomplete))
- copyright
- draft
- email
- issue
- phone
- series
- title
- vocabulary (see [Spell check and autocomplete](#spell-check-and-autocomplete))
- volume
- writer

# Dialog word count

All words in dialog sections are tallied and displayed on the corresponding character,
panel and pages headings. To view the word count, just hover over a heading or select
`Toggle Dialog View Count` from the `View` menu to see all at once.

# Spell check and autocomplete

The common "remember word" and "forget word" are included, of course. But on top of that,
there are two useful frontmatter variables. Setting the `characters` and/or `vocabulary`
frontmatter variables will add all the entries to the spellcheck and give you super powers.

Example:

```
characters:
  Boba Fett, Chewbacca, Worf, Ezio Auditore da Firenze, Gandalf
  Mike Wazowski, Optimus Prime, Peter Venkman, Albus Dumbledore
vocabulary: klaatu, barada, nikto
```

Now, when I type `klaatu`, it won't be treated as a misspelled word. What's more: typing
`kla` will make suggestions pop up to autocomplete the word.

Not every script needs these, of course, but they should be immensly helpful for sci-fi and
fantasy scripts, where spelling strange words the same way each time can be a challenge.

You can see all available words by holding down the [alt] key at any point.

# Bookmarks

Hover over the right side of the window, next to the scrollbar, to find tabs to jump to each
page of your script. Double click on a tab to set it as bookmark. Bookmarks are saved for
the next time you open your script. Double click on a bookmarked tab to remove the bookmark.
