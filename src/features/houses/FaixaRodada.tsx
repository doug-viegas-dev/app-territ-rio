import { useState } from 'react'
import { Icone } from '@/app/icones'
import { podeAbrirRodada, podeEncerrarRodada, rodadaDeOutroDia } from '@/domain/rodada'
import type { Quadra } from '@/domain/types'
import { useSessao } from '@/features/auth/AuthProvider'
import { abrirRodada, encerrarRodada } from '@/firebase/rodadas'

type Props = { cartaoId: string; quadra: Quadra; cartaoAberto: boolean; onErro: () => void }

const dataCurta = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
/** Lida a cada render: um banner aberto antes da meia-noite não pode tratar a rodada de hoje como de outro dia. */
const horaAtual = () => Date.now()
const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })

export default function FaixaRodada({ cartaoId, quadra, cartaoAberto, onErro }: Props) {
  const { usuario, membro } = useSessao()
  const atual = quadra.rodadaAtual
  const agora = horaAtual()
  // Escrita em andamento, ligada à rodada que a quadra tinha no toque: offline ela só resolve com rede,
  // então a pendência também acaba quando a quadra chega com outra rodadaAtual.
  const [pendente, setPendente] = useState<{ rodadaId: string | null } | null>(null)
  const ocupado = pendente !== null && pendente.rodadaId === (atual?.id ?? null)

  // Abrir exige cartão aberto; encerrar não: uma rodada aberta offline pode chegar depois que o cartão fechou.
  function executar(acao: typeof abrirRodada) {
    if (!usuario || ocupado) return
    const marca = { rodadaId: atual?.id ?? null }
    setPendente(marca)
    acao(cartaoId, quadra, { uid: usuario.uid, nome: membro?.nome ?? usuario.nome })
      .catch(() => onErro())
      .finally(() => setPendente((p) => (p === marca ? null : p)))
  }

  const texto = atual
    ? rodadaDeOutroDia(atual, agora)
      ? `Rodada ${atual.numero} · aberta em ${dataCurta(atual.em)} por ${atual.porNome}`
      : `Rodada ${atual.numero} · aberta por ${atual.porNome} às ${hora(atual.em)}`
    : 'Nenhuma rodada aberta'

  return <div className="aviso faixa" style={{ alignItems: 'center' }}>
    <Icone nome={atual ? 'historico' : 'info'} />
    <p>{texto}</p>
    {podeEncerrarRodada(quadra) && <button type="button" className="btn secundario medio auto" aria-disabled={ocupado ? true : undefined} onClick={() => executar(encerrarRodada)}>Encerrar rodada</button>}
    {podeAbrirRodada(quadra) && <button type="button" className="btn primario medio auto" aria-disabled={cartaoAberto && !ocupado ? undefined : true} onClick={() => { if (cartaoAberto) executar(abrirRodada) }}>Abrir rodada</button>}
  </div>
}
