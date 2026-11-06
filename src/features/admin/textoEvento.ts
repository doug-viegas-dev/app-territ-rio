import type { EventoCartao } from '@/domain/types'

export function textoEvento(e: Pick<EventoCartao, 'motivo' | 'porNome'>): string {
  switch (e.motivo) {
    case 'reinicio': return `${e.porNome} reiniciou o território`
    case 'abertura': return `${e.porNome} abriu o cartão`
    case 'fechamento_manual': return `${e.porNome} fechou manualmente`
    case 'fechamento_automatico': return `Automático: ${e.porNome} registrou a última casa`
    case 'criacao': return `${e.porNome} criou o cartão`
  }
}
