import deepEqual from 'deep-equal'
import { Debounce } from 'lodash-decorators/debounce'
import { Delay } from 'lodash-decorators/delay'
import pdfjs, { GlobalWorkerOptions } from 'pdfjs-dist'
import { Component, Emit, Prop, Vue, Watch } from 'vue-property-decorator'

import { ExportFileFormat, ExportSettings } from '../../superscript.formatting'
import { Md } from '../export/md'
import { Pdf } from '../export/pdf'
import { Txt } from '../export/txt'
import { renderer } from '../renderer'

import './export-previewer.styl'
import WithRender from './export-previewer.vue.html'

GlobalWorkerOptions.workerPort = new Worker('./pdf.worker.min.mjs', { type: 'module' })

// @ts-ignore
@WithRender
@Component
export class ExportPreviewer extends Vue {
  $refs: Vue['$refs'] & {
    canvases: HTMLDivElement,
    loadingGraphic: SVGElement
  }

  pageCutoff = 10
  pageCount = 0
  pdfBuffer: Buffer

  @Prop() exportSettings: ExportSettings | null

  get showDocxWarning() {
    return this.exportSettings && this.exportSettings.exportFileFormat === ExportFileFormat.Docx
  }

  get showCutoffWarning() {
    return this.exportSettings && this.exportSettings.exportFileFormat === ExportFileFormat.Docx && this.pageCount > this.pageCutoff
  }

  @Emit('setReadyToPrint')
  setReadyToPrint(isReady: boolean) {
    return isReady
  }

  @Watch('exportSettings', { deep: true })
  @Debounce(100)
  @Delay(0)
  async renderPreview() {
    this.setReadyToPrint(false)

    const scrollTop = this.$el.scrollTop
    this.$refs.canvases.innerHTML = ''
    this.$refs.loadingGraphic.style.display = 'block'

    if (this.exportSettings && renderer.contents) {
      switch (this.exportSettings.exportFileFormat) {
        case ExportFileFormat.Docx:
          await this.renderPdf({ ...this.exportSettings }, this.pageCutoff)
          break
        case ExportFileFormat.Pdf:
          await this.renderPdf({ ...this.exportSettings })
          break
        case ExportFileFormat.Markdown:
          await this.renderMd({ ...this.exportSettings })
          break
        case ExportFileFormat.Text:
          await this.renderTxt({ ...this.exportSettings })
          break
      }

      this.$el.scrollTop = scrollTop
      this.$refs.loadingGraphic.style.display = 'none'
    }
  }

  async renderPdf(exportSettings: ExportSettings, displayedPages?: number) {
    const pdf = new Pdf(renderer.contents, exportSettings, renderer.tempDirectory)
    this.pdfBuffer = await pdf.getBuffer()
    const uint8Array = new Uint8Array(this.pdfBuffer)

    const pdfDoc = await (pdfjs.getDocument(uint8Array).promise as unknown as Promise<pdfjs.PDFDocumentProxy>)
    const scale = 3
    this.pageCount = pdfDoc.numPages

    displayedPages = Math.min(pdfDoc.numPages, displayedPages ?? pdfDoc.numPages)

    // Generate pages in parallel
    const pagePromises: Promise<pdfjs.PDFPageProxy>[] = []

    for (let num = 1; num <= displayedPages; num++) {
      pagePromises.push(pdfDoc.getPage(num))
    }

    const pages = await Promise.all(pagePromises as unknown as Promise<pdfjs.PDFPageProxy>[])

    // If passed in exportSettings no longer match this.exportSettings, abandon execution
    if (!deepEqual(exportSettings, this.exportSettings)) {
      return
    }

    const renderTasks: Promise<void>[] = []

    for (let num = 0; num < pages.length; num++) {
      const canvas = document.createElement('CANVAS') as HTMLCanvasElement

      const canvasContext = canvas.getContext('2d')!
      const viewport = pages[num].getViewport({ scale })

      canvas.height = viewport.height
      canvas.width = viewport.width

      renderTasks.push(pages[num].render({ canvasContext, viewport }).promise)

      this.$refs.canvases.appendChild(canvas)
    }

    await Promise.all(renderTasks)

    this.setReadyToPrint(true)
  }

  async renderMd(exportSettings: ExportSettings) {
    const md = new Md(renderer.contents, exportSettings)
    const textDiv = document.createElement('DIV')
    textDiv.classList.add('text-preview')
    textDiv.innerText = md.contents
    renderer.textContents = md.contents
    this.$refs.canvases.appendChild(textDiv)
  }

  async renderTxt(exportSettings: ExportSettings) {
    const txt = new Txt(renderer.contents, exportSettings)
    const textDiv = document.createElement('DIV')
    textDiv.classList.add('text-preview')
    textDiv.innerText = txt.contents
    renderer.textContents = txt.contents
    this.$refs.canvases.appendChild(textDiv)
  }
}
