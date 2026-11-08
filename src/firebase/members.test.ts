import { beforeEach, describe, expect, it, vi } from 'vitest'

type Snap = { exists: () => boolean; data: () => unknown; metadata: { fromCache: boolean } }
let emitir: (s: Snap) => void = () => undefined

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  onSnapshot: (_ref: unknown, ok: (s: Snap) => void) => { emitir = ok; return () => undefined },
}))
vi.mock('./app', () => ({ db: {} }))

import { observarMembro } from './members'

const snap = (existe: boolean, fromCache: boolean): Snap => ({
  exists: () => existe,
  data: () => (existe ? { papel: 'admin', ativo: true, nome: 'Ana' } : undefined),
  metadata: { fromCache },
})

describe('observarMembro', () => {
  const cb = vi.fn()
  beforeEach(() => { cb.mockClear(); observarMembro('Ana@Gmail.com', cb) })

  it('entrega o membro quando o servidor confirma', () => {
    emitir(snap(true, false))
    expect(cb).toHaveBeenCalledWith({ papel: 'admin', ativo: true, nome: 'Ana' })
  })

  it('entrega null quando o servidor confirma que não existe', () => {
    emitir(snap(false, false))
    expect(cb).toHaveBeenCalledWith(null)
  })

  it('não conclui "não liberado" com base num cache vazio (conexão falhou)', () => {
    emitir(snap(false, true))
    expect(cb).not.toHaveBeenCalled()
  })
})

describe('observarMembro, erros de leitura', () => {
  let falhar: (e: { code: string }) => void = () => undefined
  const cb = vi.fn()

  beforeEach(async () => {
    cb.mockClear()
    const fs = await import('firebase/firestore')
    vi.spyOn(fs, 'onSnapshot').mockImplementation(((_r: unknown, _ok: unknown, erro: (e: { code: string }) => void) => {
      falhar = erro
      return () => undefined
    }) as never)
    observarMembro('ana@gmail.com', cb)
  })

  it('permission-denied significa e-mail não liberado', () => {
    falhar({ code: 'permission-denied' })
    expect(cb).toHaveBeenCalledWith(null)
  })

  it('erro de conexão não significa e-mail não liberado', () => {
    falhar({ code: 'unavailable' })
    expect(cb).not.toHaveBeenCalled()
  })
})
