import { quadrasComRodadaAberta } from '@/domain/rodada'
import type { Quadra } from '@/domain/types'

/** Diz onde estão as rodadas abertas: a quadra pode estar fora da lista do cartão. */
export default function AvisoRodadas({ quadras, estilo }: { quadras: Quadra[]; estilo?: React.CSSProperties }) {
  const nomes = quadrasComRodadaAberta(quadras).map((q) => q.rotulo).join(', ')
  return <p role="status" style={{ color: 'var(--texto-suave)', ...estilo }}>
    <span>Encerre as voltas abertas antes de fechar.</span> <span>Volta aberta em: {nomes}.</span>
  </p>
}
