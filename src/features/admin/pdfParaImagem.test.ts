import { afterEach, describe, expect, it, vi } from 'vitest'

const render = vi.fn(() => ({ promise: Promise.resolve() }))
const getViewport = vi.fn(({ scale }: { scale: number }) => ({ width: 3200 * scale, height: 4400 * scale }))
const destroy = vi.fn()

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(() => ({ promise: Promise.resolve({ numPages: 3, getPage: async () => ({ getViewport, render }) }), destroy })),
}))

import { pdfParaImagem } from './pdfParaImagem'

function falsoCanvas() {
  const canvas = { width: 0, height: 0, getContext: () => ({}), toBlob: (cb: (b: Blob) => void, tipo: string) => cb(new Blob(['x'], { type: tipo })) }
  vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLElement)
  return canvas
}

describe('pdfParaImagem', () => {
  afterEach(() => vi.restoreAllMocks())

  it('PDF de 3 páginas devolve paginas: 3 e imagem com largura de no máximo 1600px', async () => {
    const canvas = falsoCanvas()
    const { imagem, paginas } = await pdfParaImagem(new File(['%PDF'], 'mapa.pdf', { type: 'application/pdf' }))
    expect(paginas).toBe(3)
    expect(canvas.width).toBeLessThanOrEqual(1600)
    expect(canvas.width).toBe(1600)
    expect(imagem.type).toBe('image/webp')
  })

  it('renderiza só a página 1, uma vez', async () => {
    falsoCanvas()
    render.mockClear()
    await pdfParaImagem(new File(['%PDF'], 'mapa.pdf'))
    expect(render).toHaveBeenCalledTimes(1)
  })

  it('respeita larguraMax e amplia páginas pequenas em até 3x', async () => {
    const canvas = falsoCanvas()
    await pdfParaImagem(new File(['%PDF'], 'mapa.pdf'), { larguraMax: 800 })
    expect(canvas.width).toBe(800)
    getViewport.mockImplementation(({ scale }: { scale: number }) => ({ width: 500 * scale, height: 700 * scale }))
    await pdfParaImagem(new File(['%PDF'], 'mapa.pdf'))
    expect(canvas.width).toBe(1500)
    await pdfParaImagem(new File(['%PDF'], 'mapa.pdf'), { larguraMax: 1000 })
    expect(canvas.width).toBe(1000)
  })
})
