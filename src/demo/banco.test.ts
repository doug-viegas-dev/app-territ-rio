import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cartao, Casa, EventoCartao, Quadra, Rodada, Visita } from '@/domain/types'
import { abrirRodada, criarCasa, criarCasasEmFaixa, criarQuadra, encerrarRodada, excluirCasa, fecharCartaoManual, fecharEReiniciarCartao, observarCartao, observarCartoes, observarCasas, observarEventos, observarQuadras, observarRodadas, observarVisitas, recalcularContadores, registrarVisita, reiniciarBanco } from './banco'

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
    await registrarVisita({ cartao, quadraId: quadra.id, casa: pendente, novoStatus: 'falado', rodada: 1, usuario })
    const depois = ler<Cartao | null>((cb) => observarCartao(cartao.id, cb)) as Cartao
    expect(depois.resolvidas).toBe(cartao.resolvidas + 1)
  })

  it('não fecha o cartão sozinho quando a última casa é resolvida', async () => {
    const cartao = ler<Cartao[]>(observarCartoes).find((c) => c.numero === '13') as Cartao
    const [quadra] = ler((cb: (q: import('@/domain/types').Quadra[]) => void) => observarQuadras(cartao.id, cb))
    const pendente = ler<Casa[]>((cb) => observarCasas(cartao.id, quadra.id, cb)).find((c) => c.status === 'pendente') as Casa
    await registrarVisita({ cartao, quadraId: quadra.id, casa: pendente, novoStatus: 'falado', rodada: 1, usuario })
    const depois = ler<Cartao | null>((cb) => observarCartao(cartao.id, cb)) as Cartao
    expect(depois.estado).toBe('aberto')
    expect(depois.ciclo).toBe(cartao.ciclo)
  })

  it('não registra visita em cartão fechado', async () => {
    const cartao = ler<Cartao[]>(observarCartoes).find((c) => c.estado === 'fechado') as Cartao
    const [quadra] = ler((cb: (q: import('@/domain/types').Quadra[]) => void) => observarQuadras(cartao.id, cb))
    const casa = ler<Casa[]>((cb) => observarCasas(cartao.id, quadra.id, cb))[0]
    await expect(registrarVisita({ cartao, quadraId: quadra.id, casa, novoStatus: 'falado', rodada: 1, usuario })).rejects.toThrow('Cartão fechado')
  })

  it('reiniciar o banco devolve os dados de exemplo', async () => {
    const cartao = ler<Cartao[]>(observarCartoes).find((c) => c.numero === '13') as Cartao
    const [quadra] = ler((cb: (q: import('@/domain/types').Quadra[]) => void) => observarQuadras(cartao.id, cb))
    const pendente = ler<Casa[]>((cb) => observarCasas(cartao.id, quadra.id, cb)).find((c) => c.status === 'pendente') as Casa
    await registrarVisita({ cartao, quadraId: quadra.id, casa: pendente, novoStatus: 'falado', rodada: 1, usuario })
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

  it('a semente do cartão 13 traz uma rodada aberta e uma encerrada, com seus eventos', () => {
    const cartao = ler<Cartao[]>(observarCartoes).find((c) => c.numero === '13') as Cartao
    const [q] = ler((cb: (q: Quadra[]) => void) => observarQuadras(cartao.id, cb))
    expect(q).toMatchObject({ totalCasas: 4, faltam: 1, rodadasTotal: 2, rodadaAtual: { numero: 2, porNome: 'Bruno Alves' } })
    const rodadas = ler<Rodada[]>((cb) => observarRodadas(cartao.id, q.id, cb))
    expect(rodadas.map((r) => [r.numero, r.encerradaEm !== undefined])).toEqual([[2, false], [1, true]])
    const eventos = ler<EventoCartao[]>((cb) => observarEventos(cartao.id, cb))
    expect(eventos.filter((e) => e.tipo === 'rodada').map((e) => `${e.motivo}:${e.rodada}`).sort()).toEqual(['rodada_aberta:1', 'rodada_aberta:2', 'rodada_encerrada:1'])
  })

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

  it('observarRodadas ordena da mais recente para a mais antiga por data, não por número', async () => {
    const { cartao, quadras } = cartaoQuadra()
    vi.useFakeTimers()
    try {
      vi.setSystemTime(5000)
      await abrirRodada(cartao.id, quadras()[0], usuario)
      await encerrarRodada(cartao.id, quadras()[0], usuario)
      vi.setSystemTime(2000)
      await abrirRodada(cartao.id, quadras()[0], usuario)
    } finally {
      vi.useRealTimers()
    }
    const rodadas = ler<Rodada[]>((cb) => observarRodadas(cartao.id, quadras()[0].id, cb))
    expect(rodadas.map((r) => [r.numero, r.abertaEm])).toEqual([[1, 5000], [2, 2000]])
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

describe('visitas, casas e fechamento na demonstração', () => {
  beforeEach(reiniciarBanco)
  const cenario = (numero = '12') => {
    const cartao = () => ler<Cartao[]>(observarCartoes).find((c) => c.numero === numero) as Cartao
    const quadras = () => ler<Quadra[]>((cb) => observarQuadras(cartao().id, cb))
    const casas = (quadraId: string) => ler<Casa[]>((cb) => observarCasas(cartao().id, quadraId, cb))
    return { cartao, quadras, casas }
  }

  it('registrarVisita grava a rodada na visita', async () => {
    const { cartao, quadras, casas } = cenario()
    const q = quadras()[0]
    const pendente = casas(q.id).find((c) => c.status === 'pendente') as Casa
    await registrarVisita({ cartao: cartao(), quadraId: q.id, rodada: 3, casa: pendente, novoStatus: 'falado', usuario })
    const [v] = ler<Visita[]>((cb) => observarVisitas(cartao().id, q.id, pendente.id, cb))
    expect(v).toMatchObject({ status: 'falado', rodada: 3, ciclo: cartao().ciclo })
  })

  it('registrarVisita ajusta faltam da quadra', async () => {
    const { cartao, quadras, casas } = cenario()
    const q = quadras()[0]
    const pendente = casas(q.id).find((c) => c.status === 'pendente') as Casa
    await registrarVisita({ cartao: cartao(), quadraId: q.id, rodada: 1, casa: pendente, novoStatus: 'falado', usuario })
    expect(quadras()[0].faltam).toBe(q.faltam - 1)
    await registrarVisita({ cartao: cartao(), quadraId: q.id, rodada: 1, casa: { ...pendente, status: 'falado' }, novoStatus: 'sem_resposta', usuario })
    expect(quadras()[0].faltam).toBe(q.faltam)
  })

  it('criarCasa com resultado falado grava casa e visita, com resolvidas +1 e faltam inalterado', async () => {
    const { cartao, quadras, casas } = cenario()
    const q = quadras()[0]
    const antes = cartao()
    const id = await criarCasa(antes.id, q.id, { rua: 'Rua dos Ipês', numero: '99', resultado: { status: 'falado', usuario, ciclo: antes.ciclo, rodada: 2 } }, casas(q.id))
    expect(casas(q.id).find((c) => c.id === id)).toMatchObject({ status: 'falado', ultimoPor: 'Visitante' })
    expect(ler<Visita[]>((cb) => observarVisitas(antes.id, q.id, id, cb))[0]).toMatchObject({ status: 'falado', rodada: 2, ciclo: antes.ciclo })
    expect(cartao()).toMatchObject({ totalCasas: antes.totalCasas + 1, resolvidas: antes.resolvidas + 1 })
    expect(quadras()[0]).toMatchObject({ totalCasas: q.totalCasas + 1, faltam: q.faltam })
  })

  it('criarCasa com resultado nao_visitar conta como resolvida, não soma faltam e grava uma visita', async () => {
    const { cartao, quadras, casas } = cenario()
    const q = quadras()[0]
    const antes = cartao()
    const id = await criarCasa(antes.id, q.id, { rua: 'Rua dos Ipês', numero: '96', resultado: { status: 'nao_visitar', usuario, ciclo: antes.ciclo, rodada: 1 } }, casas(q.id))
    expect(casas(q.id).find((c) => c.id === id)).toMatchObject({ status: 'nao_visitar', ultimoPor: 'Visitante' })
    const visitas = ler<Visita[]>((cb) => observarVisitas(antes.id, q.id, id, cb))
    expect(visitas).toHaveLength(1)
    expect(visitas[0]).toMatchObject({ status: 'nao_visitar', rodada: 1, ciclo: antes.ciclo })
    expect(cartao()).toMatchObject({ totalCasas: antes.totalCasas + 1, resolvidas: antes.resolvidas + 1 })
    expect(quadras()[0]).toMatchObject({ totalCasas: q.totalCasas + 1, faltam: q.faltam })
  })

  it('criarCasa com resultado pendente ou sem resultado não cria visita', async () => {
    const { cartao, quadras, casas } = cenario()
    const q = quadras()[0]
    const antes = cartao()
    const comPendente = await criarCasa(antes.id, q.id, { rua: 'Rua dos Ipês', numero: '95', resultado: { status: 'pendente', usuario, ciclo: antes.ciclo, rodada: 1 } }, casas(q.id))
    const semResultado = await criarCasa(antes.id, q.id, { rua: 'Rua dos Ipês', numero: '94' }, casas(q.id))
    expect(ler<Visita[]>((cb) => observarVisitas(antes.id, q.id, comPendente, cb))).toEqual([])
    expect(ler<Visita[]>((cb) => observarVisitas(antes.id, q.id, semResultado, cb))).toEqual([])
    expect(cartao().resolvidas).toBe(antes.resolvidas)
  })

  it('criarCasa com resultado sem_resposta soma faltam; criarCasa pendente soma totalCasas e faltam', async () => {
    const { cartao, quadras, casas } = cenario()
    const q = quadras()[0]
    const antes = cartao()
    await criarCasa(antes.id, q.id, { rua: 'Rua dos Ipês', numero: '98', resultado: { status: 'sem_resposta', usuario, ciclo: antes.ciclo, rodada: 1 } }, casas(q.id))
    expect(quadras()[0]).toMatchObject({ totalCasas: q.totalCasas + 1, faltam: q.faltam + 1 })
    expect(cartao().resolvidas).toBe(antes.resolvidas)
    await criarCasa(antes.id, q.id, { rua: 'Rua dos Ipês', numero: '97' }, casas(q.id))
    expect(quadras()[0]).toMatchObject({ totalCasas: q.totalCasas + 2, faltam: q.faltam + 2 })
    expect(cartao().totalCasas).toBe(antes.totalCasas + 2)
  })

  it('criarCasasEmFaixa soma o tamanho da faixa em totalCasas e faltam', async () => {
    const { cartao, quadras, casas } = cenario()
    const q = quadras()[0]
    await criarCasasEmFaixa(cartao().id, q.id, { rua: 'Rua dos Ipês', numeros: ['30', '32', '34'] }, casas(q.id))
    expect(quadras()[0]).toMatchObject({ totalCasas: q.totalCasas + 3, faltam: q.faltam + 3 })
  })

  it('excluirCasa de casa que falta reduz faltam e totalCasas; de casa resolvida reduz resolvidas', async () => {
    const { cartao, quadras, casas } = cenario()
    const q = quadras()[0]
    const antes = cartao()
    await excluirCasa(antes.id, q.id, casas(q.id).find((c) => c.status === 'pendente') as Casa)
    expect(quadras()[0]).toMatchObject({ totalCasas: q.totalCasas - 1, faltam: q.faltam - 1 })
    await excluirCasa(antes.id, q.id, casas(q.id).find((c) => c.status === 'falado') as Casa)
    expect(quadras()[0]).toMatchObject({ totalCasas: q.totalCasas - 2, faltam: q.faltam - 1 })
    expect(cartao()).toMatchObject({ totalCasas: antes.totalCasas - 2, resolvidas: antes.resolvidas - 1 })
  })

  it('fecharCartaoManual lança erro com rodada aberta e não sobe o ciclo', async () => {
    const { cartao, quadras } = cenario()
    const antes = cartao()
    await abrirRodada(antes.id, quadras()[0], usuario)
    await expect(fecharCartaoManual(antes, usuario, quadras())).rejects.toThrow('Rodada aberta')
    expect(cartao().estado).toBe('aberto')
    await encerrarRodada(antes.id, quadras()[0], usuario)
    await fecharCartaoManual(antes, usuario, quadras())
    expect(cartao()).toMatchObject({ estado: 'fechado', ciclo: antes.ciclo })
    expect(ler<EventoCartao[]>((cb) => observarEventos(antes.id, cb)).find((e) => e.motivo === 'fechamento_manual')).toMatchObject({ tipo: 'fechado' })
  })

  it('fecharEReiniciarCartao deixa o cartão fechado, ciclo +1, casas Pendente menos Não visitar, faltam por quadra e um evento', async () => {
    const { cartao, quadras, casas } = cenario()
    const antes = cartao()
    const todas = quadras().flatMap((q) => casas(q.id))
    await fecharEReiniciarCartao(antes, todas, quadras(), usuario)
    expect(cartao()).toMatchObject({ estado: 'fechado', ciclo: antes.ciclo + 1, resolvidas: 1 })
    for (const q of quadras()) {
      const lista = casas(q.id)
      expect(lista.every((c) => c.status === 'pendente' || c.status === 'nao_visitar')).toBe(true)
      expect(q.faltam).toBe(lista.filter((c) => c.status === 'pendente').length)
    }
    const ev = ler<EventoCartao[]>((cb) => observarEventos(antes.id, cb)).filter((e) => e.motivo === 'fechamento_reinicio')
    expect(ev).toHaveLength(1)
    expect(ev[0]).toMatchObject({ tipo: 'fechado', porNome: 'Visitante' })
  })

  it('fecharEReiniciarCartao lança erro com rodada aberta', async () => {
    const { cartao, quadras, casas } = cenario()
    const antes = cartao()
    await abrirRodada(antes.id, quadras()[1], usuario)
    await expect(fecharEReiniciarCartao(antes, quadras().flatMap((q) => casas(q.id)), quadras(), usuario)).rejects.toThrow('Rodada aberta')
    expect(cartao()).toMatchObject({ estado: 'aberto', ciclo: antes.ciclo })
  })

  it('com quadraSemContadores, criar, criar em faixa, registrar e excluir não mexem nos contadores da quadra, mas atualizam o cartão', async () => {
    const { cartao, quadras, casas } = cenario()
    const q = quadras()[0]
    const antes = cartao()
    const op = { quadraSemContadores: true }
    const id = await criarCasa(antes.id, q.id, { rua: 'Rua dos Ipês', numero: '90' }, casas(q.id), op)
    await criarCasasEmFaixa(antes.id, q.id, { rua: 'Rua dos Ipês', numeros: ['92', '94'] }, casas(q.id), op)
    expect(cartao().totalCasas).toBe(antes.totalCasas + 3)
    const nova = casas(q.id).find((c) => c.id === id) as Casa
    await registrarVisita({ cartao: cartao(), quadraId: q.id, rodada: 1, casa: nova, novoStatus: 'falado', usuario, quadraSemContadores: true })
    expect(cartao().resolvidas).toBe(antes.resolvidas + 1)
    await excluirCasa(antes.id, q.id, casas(q.id).find((c) => c.id === id) as Casa, op)
    expect(cartao()).toMatchObject({ totalCasas: antes.totalCasas + 2, resolvidas: antes.resolvidas })
    expect(quadras()[0]).toMatchObject({ totalCasas: q.totalCasas, faltam: q.faltam })
  })

  it('fecharEReiniciarCartao grava totalCasas de cada quadra a partir das casas', async () => {
    const { cartao, quadras, casas } = cenario()
    const q = quadras()[0]
    // contador da quadra defasado de propósito (como numa quadra antiga)
    await criarCasasEmFaixa(cartao().id, q.id, { rua: 'Rua dos Ipês', numeros: ['92', '94'] }, casas(q.id), { quadraSemContadores: true })
    expect(quadras()[0].totalCasas).toBe(q.totalCasas)
    await fecharEReiniciarCartao(cartao(), quadras().flatMap((x) => casas(x.id)), quadras(), usuario)
    for (const x of quadras()) expect(x.totalCasas).toBe(casas(x.id).length)
  })

  it('recalcularContadores mantém totalCasas e faltam da quadra coerentes com as casas', async () => {
    const { cartao, quadras, casas } = cenario()
    const q = quadras()[0]
    await recalcularContadores(cartao().id)
    expect(quadras()[0]).toMatchObject({ totalCasas: casas(q.id).length, faltam: casas(q.id).filter((c) => c.status === 'pendente' || c.status === 'sem_resposta').length })
  })
})
