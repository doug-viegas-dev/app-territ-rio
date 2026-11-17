import { beforeEach, describe, expect, it } from 'vitest'
import type { Campanha, Cartao, Casa, EventoCartao, Quadra, Rodada } from '@/domain/types'
import { abrirRodada, encerrarCampanha, iniciarCampanha, observarCampanha, observarCartoes, observarCasas, observarEventos, observarQuadras, observarRodadas, reiniciarBanco } from './banco'

const usuario = { uid: 'demo', nome: 'Visitante' }

function ler<T>(observar: (cb: (v: T) => void) => () => void): T {
  let valor: T | undefined
  observar((v) => { valor = v })()
  return valor as T
}

const cartao12 = () => ler<Cartao[]>(observarCartoes).find((c) => c.numero === '12') as Cartao
const quadras = () => ler<Quadra[]>((cb) => observarQuadras(cartao12().id, cb))
const casas = () => quadras().flatMap((q) => ler<Casa[]>((cb) => observarCasas(cartao12().id, q.id, cb)))
const campanha = () => ler<Campanha | null>(observarCampanha)

describe('campanha no banco de demonstração', () => {
  beforeEach(reiniciarBanco)

  it('começa sem campanha', () => {
    expect(campanha()).toBeNull()
  })

  it('iniciar guardando deixa os cartões limpos e fechados, e retomar devolve tudo como estava', async () => {
    const antes = { cartao: cartao12(), quadras: quadras(), casas: casas() }
    expect(antes.cartao.resolvidas).toBeGreaterThan(0)
    await iniciarCampanha({ nome: 'Convites', resultados: ['falado', 'carta'], guardar: true }, usuario)

    expect(campanha()).toMatchObject({ nome: 'Convites', resultados: ['falado', 'carta'], guardou: true, fase: 'ativa' })
    expect(cartao12()).toMatchObject({ estado: 'fechado', resolvidas: 0, ciclo: antes.cartao.ciclo })
    expect(casas().every((c) => c.status === 'pendente')).toBe(true)
    expect(quadras().every((q) => q.rodadasTotal === 0 && !q.rodadaAtual)).toBe(true)

    await encerrarCampanha({ retomar: true }, usuario)
    expect(campanha()).toBeNull()
    expect(cartao12()).toMatchObject({ estado: antes.cartao.estado, ciclo: antes.cartao.ciclo, totalCasas: antes.cartao.totalCasas, resolvidas: antes.cartao.resolvidas })
    expect(casas().map((c) => [c.id, c.status])).toEqual(antes.casas.map((c) => [c.id, c.status]))
    expect(quadras().map((q) => [q.rodadasTotal, q.rodadaAtual?.id, q.faltam])).toEqual(antes.quadras.map((q) => [q.rodadasTotal, q.rodadaAtual?.id, q.faltam]))
  })

  it('o trabalho feito na campanha não vaza para a retomada', async () => {
    const antes = casas().map((c) => [c.id, c.status])
    await iniciarCampanha({ nome: 'Convites', resultados: ['falado', 'carta'], guardar: true }, usuario)
    const q = quadras()[0]
    await abrirRodada(cartao12().id, q, usuario, 'Convites')
    expect(quadras()[0]).toMatchObject({ rodadasTotal: 1 })
    await expect(abrirRodada(cartao12().id, quadras()[0], usuario, 'Convites')).rejects.toThrow()
    await encerrarCampanha({ retomar: true }, usuario)
    expect(casas().map((c) => [c.id, c.status])).toEqual(antes)
  })

  it('encerrar sem retomar recomeça do zero e sobe o ciclo', async () => {
    const ciclo = cartao12().ciclo
    await iniciarCampanha({ nome: 'Convites', resultados: ['falado'], guardar: true }, usuario)
    await encerrarCampanha({ retomar: false }, usuario)
    expect(campanha()).toBeNull()
    expect(cartao12()).toMatchObject({ estado: 'fechado', resolvidas: 0, ciclo: ciclo + 1 })
    expect(casas().every((c) => c.status === 'pendente')).toBe(true)
  })

  it('iniciar sem guardar perde o progresso: ao encerrar, mesmo pedindo retomar, fica do zero', async () => {
    await iniciarCampanha({ nome: 'Convites', resultados: ['falado'], guardar: false }, usuario)
    await encerrarCampanha({ retomar: true }, usuario)
    expect(casas().every((c) => c.status === 'pendente')).toBe(true)
    expect(cartao12().resolvidas).toBe(0)
  })

  it('não aceita duas campanhas ao mesmo tempo', async () => {
    await iniciarCampanha({ nome: 'A', resultados: ['falado'], guardar: false }, usuario)
    await expect(iniciarCampanha({ nome: 'B', resultados: ['falado'], guardar: false }, usuario)).rejects.toThrow()
  })

  describe('registro de fechamentos', () => {
    const cartao13 = () => ler<Cartao[]>(observarCartoes).find((c) => c.numero === '13') as Cartao
    const eventos = (id: string) => ler<EventoCartao[]>((cb) => observarEventos(id, cb, 100)).map((e) => e.motivo)

    it('ao iniciar, registra o encerramento da volta aberta e o fechamento dos cartões abertos (guardando ou não)', async () => {
      for (const guardar of [true, false]) {
        reiniciarBanco()
        const c13 = cartao13()
        const q = ler<Quadra[]>((cb) => observarQuadras(c13.id, cb))[0]
        const rodadaId = q.rodadaAtual?.id as string
        expect(rodadaId).toBeTruthy()
        await iniciarCampanha({ nome: 'Convites', resultados: ['falado'], guardar }, usuario)
        const ev = eventos(c13.id)
        expect(ev).toContain('rodada_encerrada')
        expect(ev).toContain('fechamento_campanha')
        const r = ler<Rodada[]>((cb) => observarRodadas(c13.id, q.id, cb)).find((x) => x.id === rodadaId)
        expect(r?.encerradaEm).toBeDefined()
        expect(eventos(ler<Cartao[]>(observarCartoes).find((c) => c.numero === '14')?.id as string)).not.toContain('fechamento_campanha')
      }
    })

    it('ao retomar, a volta e o cartão voltam a ficar abertos, com registro', async () => {
      const c13 = cartao13()
      const q = ler<Quadra[]>((cb) => observarQuadras(c13.id, cb))[0]
      await iniciarCampanha({ nome: 'Convites', resultados: ['falado'], guardar: true }, usuario)
      await encerrarCampanha({ retomar: true }, usuario)
      expect(eventos(c13.id)).toEqual(expect.arrayContaining(['retomada_campanha', 'rodada_aberta']))
      const r = ler<Rodada[]>((cb) => observarRodadas(c13.id, q.id, cb)).find((x) => x.id === q.rodadaAtual?.id)
      expect(r?.encerradaEm).toBeUndefined()
    })

    it('ao encerrar a campanha do zero, fecha a volta da campanha que estiver aberta', async () => {
      await iniciarCampanha({ nome: 'Convites', resultados: ['falado'], guardar: false }, usuario)
      const c13 = cartao13()
      const q = ler<Quadra[]>((cb) => observarQuadras(c13.id, cb))[0]
      await abrirRodada(c13.id, q, usuario, 'Convites')
      const antes = eventos(c13.id).filter((m) => m === 'rodada_encerrada').length
      await encerrarCampanha({ retomar: false }, usuario)
      expect(eventos(c13.id).filter((m) => m === 'rodada_encerrada').length).toBe(antes + 1)
    })
  })
})
