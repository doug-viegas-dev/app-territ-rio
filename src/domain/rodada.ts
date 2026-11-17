import type { Casa, Cartao, Quadra, RodadaAtual } from './types'

/** Quadra com contadores, mas com números impossíveis: pede "Recalcular contadores". `semContadores` é outro caso. */
export function contadoresDaQuadraSuspeitos(q: Pick<Quadra, 'totalCasas' | 'faltam' | 'semContadores'>): boolean {
  return !q.semContadores && (q.faltam < 0 || q.faltam > q.totalCasas || q.totalCasas < 0)
}
/** Voltas da quadra, inclusive a que está aberta e ainda não foi encerrada. */
export function voltasFeitas(q: Pick<Quadra, 'rodadasTotal'>): number {
  return Math.max(0, q.rodadasTotal)
}
export function textoVoltasFeitas(n: number): string {
  return n === 0 ? 'Nenhuma volta' : n === 1 ? '1 volta' : `${n} voltas`
}
/** Na campanha cada quadra tem uma volta só: depois de feita, não abre outra. */
export function podeAbrirRodada(q: Pick<Quadra, 'rodadaAtual'> & Partial<Pick<Quadra, 'rodadasTotal'>>, naCampanha = false): boolean {
  return !q.rodadaAtual && !(naCampanha && (q.rodadasTotal ?? 0) >= 1)
}
export function podeEncerrarRodada(q: Pick<Quadra, 'rodadaAtual'>): boolean { return !!q.rodadaAtual }
export function proximoNumeroRodada(q: Pick<Quadra, 'rodadasTotal'>): number { return q.rodadasTotal + 1 }
export function podeRegistrarNaQuadra(c: Pick<Cartao, 'estado'>, q: Pick<Quadra, 'rodadaAtual'>): boolean {
  return c.estado === 'aberto' && !!q.rodadaAtual
}
export function podeRegistrarNaCasa(c: Pick<Cartao, 'estado'>, q: Pick<Quadra, 'rodadaAtual'>, casa: Pick<Casa, 'naoVisitar'>): boolean {
  return podeRegistrarNaQuadra(c, q) && !casa.naoVisitar
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
