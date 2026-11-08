import type { Cartao, Quadra, RodadaAtual } from './types'

export function podeAbrirRodada(q: Pick<Quadra, 'rodadaAtual'>): boolean { return !q.rodadaAtual }
export function podeEncerrarRodada(q: Pick<Quadra, 'rodadaAtual'>): boolean { return !!q.rodadaAtual }
export function proximoNumeroRodada(q: Pick<Quadra, 'rodadasTotal'>): number { return q.rodadasTotal + 1 }
export function podeRegistrarNaQuadra(c: Pick<Cartao, 'estado'>, q: Pick<Quadra, 'rodadaAtual'>): boolean {
  return c.estado === 'aberto' && !!q.rodadaAtual
}
export function rodadaDeOutroDia(r: Pick<RodadaAtual, 'em'>, agora: number): boolean {
  return new Date(r.em).toDateString() !== new Date(agora).toDateString()
}
export function quadrasComRodadaAberta<Q extends Pick<Quadra, 'rodadaAtual'>>(qs: Q[]): Q[] { return qs.filter((q) => !!q.rodadaAtual) }
export function podeFecharCartao(qs: Pick<Quadra, 'rodadaAtual'>[]): boolean { return quadrasComRodadaAberta(qs).length === 0 }
/** Some só a quadra com contagem confiável, sem casas faltando e sem rodada aberta. */
export function quadrasParaVisitar<Q extends Pick<Quadra, 'totalCasas' | 'faltam' | 'semContadores' | 'rodadaAtual'>>(qs: Q[]): Q[] {
  return qs.filter((q) => q.semContadores || !!q.rodadaAtual || q.totalCasas === 0 || q.faltam > 0)
}
