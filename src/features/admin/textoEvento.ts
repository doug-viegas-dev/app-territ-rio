import type { EventoCartao } from '@/domain/types'

export function textoEvento(e: Pick<EventoCartao, 'motivo' | 'porNome'> & Partial<Pick<EventoCartao, 'rodada' | 'quadraRotulo'>>): string {
  switch (e.motivo) {
    case 'reinicio': return `${e.porNome} reiniciou o território`
    case 'fechamento_reinicio': return `${e.porNome} fechou e reiniciou o território`
    case 'rodada_aberta': return `${e.porNome} abriu a volta ${e.rodada} da ${e.quadraRotulo}`
    case 'rodada_encerrada': return `${e.porNome} encerrou a volta ${e.rodada} da ${e.quadraRotulo}`
    case 'abertura': return `${e.porNome} abriu o cartão`
    case 'fechamento_manual': return `${e.porNome} fechou manualmente`
    case 'fechamento_automatico': return `Automático: ${e.porNome} registrou a última casa`
    case 'criacao': return `${e.porNome} criou o cartão`
  }
}

type Tipado = Pick<EventoCartao, 'tipo' | 'motivo'>

/** Rótulo curto do evento: cor nunca é o único sinal. */
export function tituloEvento(e: Tipado): string {
  if (e.motivo === 'rodada_aberta') return 'Volta aberta'
  if (e.motivo === 'rodada_encerrada') return 'Volta encerrada'
  return e.tipo === 'aberto' ? 'Aberto' : 'Fechado'
}

export function iconeEvento(e: Tipado): string {
  if (e.tipo === 'rodada') return 'rodada'
  return e.tipo === 'aberto' ? 'cadeado-aberto' : 'cadeado'
}

export function dataHora(ms: number): string {
  const d = new Date(ms)
  return `${d.toLocaleDateString('pt-BR')} · ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

export function hora(ms: number): string {
  return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** "07/11 às 09:00": dia e mês, sem o ano. */
export function diaEHora(ms: number): string {
  const d = new Date(ms)
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${hora(ms)}`
}
