import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

/**
 * Renderiza só a página 1 do PDF como imagem WebP (largura máxima `larguraMax`)
 * (ampliada até 3x quando a página é pequena, como um A4 de ~600px, para o mapa não ficar borrado ao dar zoom)
 * e devolve o total de páginas, para o chamador avisar quando houver mais de uma.
 */
export async function pdfParaImagem(arquivo: File, opts: { larguraMax?: number } = {}): Promise<{ imagem: Blob; paginas: number }> {
  const larguraMax = opts.larguraMax ?? 1600
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const tarefa = pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) })
  try {
    const doc = await tarefa.promise
    const pagina = await doc.getPage(1)
    const base = pagina.getViewport({ scale: 1 })
    const viewport = pagina.getViewport({ scale: Math.min(3, larguraMax / base.width) })
    const canvas = document.createElement('canvas')
    canvas.width = Math.min(larguraMax, Math.round(viewport.width))
    canvas.height = Math.floor(viewport.height)
    const contexto = canvas.getContext('2d')
    if (!contexto) throw new Error('Não foi possível preparar a imagem do mapa.')
    await pagina.render({ canvas, canvasContext: contexto, viewport }).promise
    const imagem = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Não foi possível gerar a imagem do mapa.'))), 'image/webp', 0.8)
    })
    return { imagem, paginas: doc.numPages }
  } finally {
    void tarefa.destroy()
  }
}
