import { beforeEach, describe, expect, it } from 'vitest'
import type { Cartao, Casa } from '@/domain/types'
import { observarCartao, observarCartoes, observarCasas, observarQuadras, registrarVisita, reiniciarBanco } from './banco'

const usuario = { uid: 'demo', nome: 'Visitante' }

function ler<T>(observar: (cb: (v: T) => void) => () => void): T {
  let valor: T | undefined
  observar((v) => { valor = v })()
  return valor as T
}

describe('banco de demonstração', () => {
  beforeEach(reiniciarBanco)

  it('traz cartões abertos antes dos fechados', () => {
    const cartoes = ler<Cartao[]>(observarCartoes)
    expect(cartoes.map((c) => c.estado)).toEqual(['aberto', 'aberto', 'fechado'])
  })

  it('registrar visita atualiza a casa e o contador do cartão', async () => {
    const cartao = ler<Cartao[]>(observarCartoes).find((c) => c.numero === '12') as Cartao
    const [quadra] = ler((cb: (q: import('@/domain/types').Quadra[]) => void) => observarQuadras(cartao.id, cb))
    const casas = ler<Casa[]>((cb) => observarCasas(cartao.id, quadra.id, cb))
    const pendente = casas.find((c) => c.status === 'pendente') as Casa
    await registrarVisita({ cartao, quadraId: quadra.id, casa: pendente, novoStatus: 'falado', usuario })
    const depois = ler<Cartao | null>((cb) => observarCartao(cartao.id, cb)) as Cartao
    expect(depois.resolvidas).toBe(cartao.resolvidas + 1)
  })

  it('não fecha o cartão sozinho quando a última casa é resolvida', async () => {
    const cartao = ler<Cartao[]>(observarCartoes).find((c) => c.numero === '13') as Cartao
    const [quadra] = ler((cb: (q: import('@/domain/types').Quadra[]) => void) => observarQuadras(cartao.id, cb))
    const pendente = ler<Casa[]>((cb) => observarCasas(cartao.id, quadra.id, cb)).find((c) => c.status === 'pendente') as Casa
    await registrarVisita({ cartao, quadraId: quadra.id, casa: pendente, novoStatus: 'falado', usuario })
    const depois = ler<Cartao | null>((cb) => observarCartao(cartao.id, cb)) as Cartao
    expect(depois.estado).toBe('aberto')
    expect(depois.ciclo).toBe(cartao.ciclo)
  })

  it('não registra visita em cartão fechado', async () => {
    const cartao = ler<Cartao[]>(observarCartoes).find((c) => c.estado === 'fechado') as Cartao
    const [quadra] = ler((cb: (q: import('@/domain/types').Quadra[]) => void) => observarQuadras(cartao.id, cb))
    const casa = ler<Casa[]>((cb) => observarCasas(cartao.id, quadra.id, cb))[0]
    await expect(registrarVisita({ cartao, quadraId: quadra.id, casa, novoStatus: 'falado', usuario })).rejects.toThrow('Cartão fechado')
  })

  it('reiniciar o banco devolve os dados de exemplo', async () => {
    const cartao = ler<Cartao[]>(observarCartoes).find((c) => c.numero === '13') as Cartao
    const [quadra] = ler((cb: (q: import('@/domain/types').Quadra[]) => void) => observarQuadras(cartao.id, cb))
    const pendente = ler<Casa[]>((cb) => observarCasas(cartao.id, quadra.id, cb)).find((c) => c.status === 'pendente') as Casa
    await registrarVisita({ cartao, quadraId: quadra.id, casa: pendente, novoStatus: 'falado', usuario })
    reiniciarBanco()
    expect(ler<Cartao[]>(observarCartoes).find((c) => c.numero === '13')?.estado).toBe('aberto')
  })
})
