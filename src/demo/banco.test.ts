import { beforeEach, describe, expect, it } from 'vitest'
import type { Cartao, Casa, EventoCartao, Quadra, Rodada } from '@/domain/types'
import { abrirRodada, criarQuadra, encerrarRodada, observarCartao, observarCartoes, observarCasas, observarEventos, observarQuadras, observarRodadas, registrarVisita, reiniciarBanco } from './banco'

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

describe('rodadas na demonstração', () => {
  beforeEach(reiniciarBanco)
  const cartaoQuadra = () => {
    const cartao = ler<Cartao[]>(observarCartoes).find((c) => c.numero === '12') as Cartao
    const quadras = () => ler<Quadra[]>((cb) => observarQuadras(cartao.id, cb))
    return { cartao, quadras }
  }

  it('a semente traz contadores das quadras coerentes com as casas', () => {
    const { cartao, quadras } = cartaoQuadra()
    const [a, b] = quadras()
    expect(a).toMatchObject({ totalCasas: 10, faltam: 5, rodadasTotal: 0 })
    expect(b).toMatchObject({ totalCasas: 4, faltam: 3, rodadasTotal: 0 })
    expect(cartao.totalCasas).toBe(14)
  })

  it('abrirRodada cria a rodada 1 com quem e quando', async () => {
    const { cartao, quadras } = cartaoQuadra()
    const antes = Date.now()
    await abrirRodada(cartao.id, quadras()[0], usuario)
    const q = quadras()[0]
    expect(q.rodadasTotal).toBe(1)
    expect(q.rodadaAtual).toMatchObject({ numero: 1, porNome: 'Visitante' })
    expect(q.rodadaAtual?.em).toBeGreaterThanOrEqual(antes)
    const [r] = ler<Rodada[]>((cb) => observarRodadas(cartao.id, q.id, cb))
    expect(r).toMatchObject({ id: q.rodadaAtual?.id, numero: 1, abertaPorUid: 'demo', abertaPorNome: 'Visitante' })
  })

  it('abrirRodada na quadra com rodada aberta lança erro', async () => {
    const { cartao, quadras } = cartaoQuadra()
    await abrirRodada(cartao.id, quadras()[0], usuario)
    await expect(abrirRodada(cartao.id, quadras()[0], usuario)).rejects.toThrow()
    expect(ler<Rodada[]>((cb) => observarRodadas(cartao.id, quadras()[0].id, cb))).toHaveLength(1)
  })

  it('encerrarRodada grava quem e quando e limpa rodadaAtual; a seguinte é a 2', async () => {
    const { cartao, quadras } = cartaoQuadra()
    await expect(encerrarRodada(cartao.id, quadras()[0], usuario)).rejects.toThrow()
    await abrirRodada(cartao.id, quadras()[0], usuario)
    await encerrarRodada(cartao.id, quadras()[0], { uid: 'outro', nome: 'Ana' })
    const q = quadras()[0]
    expect(q.rodadaAtual).toBeUndefined()
    expect(q.rodadasTotal).toBe(1)
    const [r1] = ler<Rodada[]>((cb) => observarRodadas(cartao.id, q.id, cb))
    expect(r1).toMatchObject({ numero: 1, encerradaPorUid: 'outro', encerradaPorNome: 'Ana' })
    expect(r1.encerradaEm).toBeGreaterThan(0)
    await abrirRodada(cartao.id, quadras()[0], usuario)
    expect(quadras()[0]).toMatchObject({ rodadasTotal: 2, rodadaAtual: { numero: 2 } })
    expect(ler<Rodada[]>((cb) => observarRodadas(cartao.id, q.id, cb)).map((r) => r.numero)).toEqual([2, 1])
  })

  it('abrir e encerrar gravam eventos com quadra e número', async () => {
    const { cartao, quadras } = cartaoQuadra()
    await abrirRodada(cartao.id, quadras()[1], usuario)
    await encerrarRodada(cartao.id, quadras()[1], usuario)
    const ev = ler<EventoCartao[]>((cb) => observarEventos(cartao.id, cb)).filter((e) => e.tipo === 'rodada')
    expect(ev.map((e) => e.motivo).sort()).toEqual(['rodada_aberta', 'rodada_encerrada'])
    for (const e of ev) expect(e).toMatchObject({ quadraId: quadras()[1].id, quadraRotulo: 'B', rodada: 1, porUid: 'demo' })
  })

  it('criarQuadra nasce com contadores zerados e observarEventos respeita o limite', async () => {
    const { cartao, quadras } = cartaoQuadra()
    await criarQuadra(cartao.id, { rotulo: 'C', ruas: ['Rua X'] })
    expect(quadras().find((q) => q.rotulo === 'C')).toMatchObject({ totalCasas: 0, faltam: 0, rodadasTotal: 0 })
    expect(ler<EventoCartao[]>((cb) => observarEventos(cartao.id, cb, 2))).toHaveLength(2)
  })
})
