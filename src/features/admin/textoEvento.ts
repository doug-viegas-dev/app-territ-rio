import type { EventoCartao } from '@/domain/types'

export function textoEvento(e: Pick<EventoCartao, 'motivo' | 'porNome'> & Partial<Pick<EventoCartao, 'rodada' | 'quadraRotulo'>>): string {
  switch (e.motivo) {
    case 'reinicio': return `${e.porNome} reiniciou o território`
    case 'fechamento_reinicio': return `${e.porNome} fechou e reiniciou o território`
    case 'rodada_aberta': return `${e.porNome} abriu a rodada ${e.rodada} da ${e.quadraRotulo}`
    case 'rodada_encerrada': return `${e.porNome} encerrou a rodada ${e.rodada} da ${e.quadraRotulo}`
    case 'abertura': return `${e.porNome} abriu o cartão`
    case 'fechamento_manual': return `${e.porNome} fechou manualmente`
    case 'fechamento_automatico': return `Automático: ${e.porNome} registrou a última casa`
    case 'criacao': return `${e.porNome} criou o cartão`
  }
}
