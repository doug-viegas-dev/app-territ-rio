import type { StatusVisita } from './types'

const rotulos: Record<StatusVisita, string> = {
  pendente: 'Pendente', falado: 'Conversado', sem_resposta: 'Não atendeu', nao_em_casa: 'Não em casa', carta: 'Carta', estudo: 'Estudo', nao_visitar: 'Não visitar',
}
export function rotuloStatus(s: StatusVisita): string { return rotulos[s] }
/** Na campanha a "Carta" é o convite deixado na casa. */
export function rotuloResultado(s: StatusVisita, naCampanha: boolean): string { return naCampanha && s === 'carta' ? 'Convite deixado' : rotulos[s] }
