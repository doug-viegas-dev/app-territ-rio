import type { Status } from './types'

const rotulos: Record<Status, string> = {
  pendente: 'Pendente', sem_resposta: 'Não atendeu', falado: 'Conversado', estudo: 'Estudo', nao_visitar: 'Não visitar',
}
export function rotuloStatus(s: Status): string { return rotulos[s] }
