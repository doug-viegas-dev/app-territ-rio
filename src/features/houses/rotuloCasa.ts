import type { Casa } from '@/domain/types'

export function rotuloCasa(c: Pick<Casa, 'numero' | 'descricao'>): string {
  return [c.numero?.trim(), c.descricao?.trim()].filter(Boolean).join(' · ')
}

export const classeStatus = (s: Casa['status']) => s.replace('_', '-')
