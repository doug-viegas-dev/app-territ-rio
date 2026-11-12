import type { Casa, StatusVisita } from '@/domain/types'

export function rotuloCasa(c: Pick<Casa, 'numero' | 'descricao'>): string {
  return [c.numero?.trim(), c.descricao?.trim()].filter(Boolean).join(' · ')
}

export const classeStatus = (s: StatusVisita) => s.replaceAll('_', '-')
