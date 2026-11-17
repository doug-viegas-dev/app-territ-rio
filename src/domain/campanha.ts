import type { Campanha, Casa, Status } from './types'

export const RESULTADOS_PADRAO: Status[] = ['falado', 'sem_resposta', 'nao_em_casa', 'carta']

/** Resultados que a barra de registro oferece: os da campanha ativa, ou os quatro de sempre. */
export function resultadosDisponiveis(c: Pick<Campanha, 'resultados'> | null | undefined): Status[] {
  return c ? RESULTADOS_PADRAO.filter((s) => c.resultados.includes(s)) : RESULTADOS_PADRAO
}

export function validarCampanha(d: { nome: string; resultados: Status[] }): string | null {
  if (!d.nome.trim()) return 'Dê um nome à campanha.'
  if (d.resultados.length === 0) return 'Escolha ao menos um resultado.'
  return null
}

/** Só as casas fora de Pendente precisam ser guardadas: as demais voltam a Pendente sozinhas. */
export type CasaGuardada = { cartaoId: string; quadraId: string; status: Status; ultimaVisitaEm?: number; ultimoPor?: string }
export function guardarCasa(cartaoId: string, quadraId: string, c: Pick<Casa, 'status' | 'ultimaVisitaEm' | 'ultimoPor'>): CasaGuardada | null {
  if (c.status === 'pendente') return null
  return { cartaoId, quadraId, status: c.status, ...(c.ultimaVisitaEm !== undefined && { ultimaVisitaEm: c.ultimaVisitaEm }), ...(c.ultimoPor !== undefined && { ultimoPor: c.ultimoPor }) }
}

/** Estado da casa depois de retomar (com a cópia) ou de recomeçar do zero (sem ela). */
export function estadoDaCasa(guardada: CasaGuardada | undefined): { status: Status; ultimaVisitaEm?: number; ultimoPor?: string } {
  return guardada ? { status: guardada.status, ultimaVisitaEm: guardada.ultimaVisitaEm, ultimoPor: guardada.ultimoPor } : { status: 'pendente' }
}

export type CartaoGuardado = { estado: 'aberto' | 'fechado'; ciclo: number; abertoPorNome?: string; abertoEm?: number; quadras: Record<string, { rodadasTotal: number; rodadaAtual?: { id: string; numero: number; porNome: string; em: number } }> }

/** Texto curto da situação, para a Administração. */
export function situacaoDaCampanha(c: Pick<Campanha, 'fase'>): string {
  return c.fase === 'ativa' ? 'Em andamento' : c.fase === 'iniciando' ? 'Iniciando' : 'Encerrando'
}
