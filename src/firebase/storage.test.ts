import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  ref: vi.fn((_s: unknown, path: string) => ({ fullPath: path })),
  uploadBytes: vi.fn().mockResolvedValue({}),
  deleteObject: vi.fn().mockResolvedValue(undefined),
  listAll: vi.fn(),
  getDownloadURL: vi.fn(),
}))
vi.mock('firebase/storage', () => m)
vi.mock('./app', () => ({ storage: {} }))
vi.mock('@/demo/modo', () => ({ demoAtivo: () => false }))
vi.mock('@/demo/banco', () => ({}))

import { apagarArquivos, apagarArquivosDoCartao, enviarArquivosDoCartao } from './storage'

const arquivos = { pdf: new Blob(['a']), imagem: new Blob(['b']) }

describe('storage do cartão', () => {
  beforeEach(() => { vi.useFakeTimers(); m.deleteObject.mockReset().mockResolvedValue(undefined); m.uploadBytes.mockClear() })
  afterEach(() => vi.useRealTimers())

  it('envia para um caminho novo a cada troca', async () => {
    vi.setSystemTime(1000)
    const a = await enviarArquivosDoCartao('c1', arquivos)
    vi.setSystemTime(2000)
    const b = await enviarArquivosDoCartao('c1', arquivos)
    expect(a.pdfPath).toMatch(/^cards\/c1\/mapa-\d+\.pdf$/)
    expect(a.imagemPath).toMatch(/^cards\/c1\/mapa-\d+\.webp$/)
    expect(b.pdfPath).not.toBe(a.pdfPath)
    expect(b.imagemPath).not.toBe(a.imagemPath)
  })

  it('apagarArquivos ignora undefined e apaga os demais', async () => {
    await apagarArquivos([undefined, 'cards/c1/a.pdf'])
    expect(m.deleteObject).toHaveBeenCalledTimes(1)
  })
  it('ignora object-not-found e propaga outro erro', async () => {
    m.deleteObject.mockRejectedValueOnce({ code: 'storage/object-not-found' })
    await expect(apagarArquivos(['cards/c1/a.pdf'])).resolves.toBeUndefined()
    m.deleteObject.mockRejectedValueOnce({ code: 'storage/unauthorized' })
    await expect(apagarArquivos(['cards/c1/a.pdf'])).rejects.toMatchObject({ code: 'storage/unauthorized' })
  })
  it('apagarArquivosDoCartao apaga cada item listado', async () => {
    m.listAll.mockResolvedValue({ items: [{ fullPath: 'cards/c1/mapa.pdf' }, { fullPath: 'cards/c1/mapa-1.webp' }], prefixes: [] })
    await apagarArquivosDoCartao('c1')
    expect(m.deleteObject).toHaveBeenCalledTimes(2)
  })
})
