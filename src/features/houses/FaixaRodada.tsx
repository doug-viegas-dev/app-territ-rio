import { useEffect, useRef, useState } from 'react'
import { podeAbrirRodada, podeEncerrarRodada, rodadaDeOutroDia } from '@/domain/rodada'
import type { Quadra } from '@/domain/types'
import { useSessao } from '@/features/auth/AuthProvider'
import { abrirRodada, encerrarRodada } from '@/firebase/rodadas'

type Props = { cartaoId: string; quadra: Quadra; cartaoAberto: boolean; onErro: () => void }

const dataCurta = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
/** Lida a cada render: um banner aberto antes da meia-noite não pode tratar a rodada de hoje como de outro dia. */
const horaAtual = () => Date.now()
/** Depois que a faixa troca de Abrir para Encerrar (ou o contrário) por uma ação deste aparelho, o botão novo espera isto antes de aceitar toque. */
const PAUSA_APOS_TROCA_MS = 1500
const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })

export default function FaixaRodada({ cartaoId, quadra, cartaoAberto, onErro }: Props) {
  const { usuario, membro } = useSessao()
  const atual = quadra.rodadaAtual
  const agora = horaAtual()
  // Escrita em andamento, ligada à rodada que a quadra tinha no toque: offline ela só resolve com rede,
  // então a pendência também acaba quando a quadra chega com outra rodadaAtual.
  const [pendente, setPendente] = useState<{ rodadaId: string | null } | null>(null)
  const ocupado = pendente !== null && pendente.rodadaId === (atual?.id ?? null)
  // Ação deste aparelho cuja troca de rodada ainda não chegou à faixa. Mudança vinda de outro aparelho não passa por aqui.
  const acaoLocal = useRef<{ rodadaId: string | null } | null>(null)
  const [pausado, setPausado] = useState(false)
  const idAtual = atual?.id ?? null

  useEffect(() => {
    if (acaoLocal.current === null || acaoLocal.current.rodadaId === idAtual) return
    acaoLocal.current = null
    setPausado(true)
  }, [idAtual])

  useEffect(() => {
    if (!pausado) return
    const t = setTimeout(() => setPausado(false), PAUSA_APOS_TROCA_MS)
    return () => clearTimeout(t)
  }, [pausado])

  // Abrir exige cartão aberto; encerrar não: uma rodada aberta offline pode chegar depois que o cartão fechou.
  function executar(acao: typeof abrirRodada) {
    if (!usuario || ocupado || pausado) return
    const marca = { rodadaId: atual?.id ?? null }
    setPendente(marca)
    acaoLocal.current = marca
    acao(cartaoId, quadra, { uid: usuario.uid, nome: membro?.nome ?? usuario.nome })
      .catch(() => {
        if (acaoLocal.current === marca) acaoLocal.current = null
        onErro()
      })
      .finally(() => setPendente((p) => (p === marca ? null : p)))
  }

  // Título curto numa linha; quem e quando na segunda, cortado com reticências se faltar largura.
  const titulo = atual ? `Volta ${atual.numero}` : 'Nenhuma volta aberta'
  const detalhe = atual
    ? rodadaDeOutroDia(atual, agora)
      ? `aberta em ${dataCurta(atual.em)} por ${atual.porNome}`
      : `aberta por ${atual.porNome} às ${hora(atual.em)}`
    : null

  return <div className="aviso faixa volta">
    <p><b>{titulo}</b>{detalhe && <span className="detalhe">{detalhe}</span>}</p>
    {podeEncerrarRodada(quadra) && <button type="button" className="btn secundario medio auto" aria-disabled={ocupado || pausado ? true : undefined} onClick={() => executar(encerrarRodada)}>Encerrar volta</button>}
    {podeAbrirRodada(quadra) && <button type="button" className="btn primario medio auto" aria-disabled={cartaoAberto && !ocupado && !pausado ? undefined : true} onClick={() => { if (cartaoAberto) executar(abrirRodada) }}>Abrir volta</button>}
  </div>
}
