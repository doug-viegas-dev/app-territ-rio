import { useState } from 'react'
import { Icone } from '@/app/icones'
import ConfirmarReinicio from '@/features/admin/ConfirmarReinicio'
import { useSessao } from '@/features/auth/AuthProvider'
import { podeFecharCartao } from '@/domain/rodada'
import type { Cartao, Quadra } from '@/domain/types'
import { fecharEReiniciarCartao } from '@/firebase/houses'
import ConfirmarFechamento from './ConfirmarFechamento'

/** Só administradores, só com o cartão aberto. `quadras` é `null` enquanto ainda não chegaram. */
export default function BotaoFecharCartao({ cartao, quadras, discreto = false }: { cartao: Cartao; quadras: Quadra[] | null; discreto?: boolean }) {
  const { usuario, membro } = useSessao()
  const [folha, setFolha] = useState<'fechar' | 'reiniciar' | null>(null)
  const [erro, setErro] = useState(false)
  if (membro?.papel !== 'admin' || cartao.estado !== 'aberto' || !usuario) return null
  const quem = { uid: usuario.uid, nome: membro.nome ?? usuario.nome }

  return <>
    {erro && folha === null && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p><b>Não foi possível salvar</b>Tente de novo.</p></div>}
    <p style={{ margin: discreto ? '16px 0 0' : '12px 0 0', textAlign: discreto ? 'center' : undefined }}>
      <button type="button" className={discreto ? 'btn link' : 'btn secundario medio auto'} style={{ minHeight: 48 }} disabled={quadras === null} onClick={() => { setErro(false); setFolha('fechar') }}><Icone nome="cadeado" className="ic ic-20" />Fechar cartão</button>
    </p>
    {folha === 'fechar' && quadras && <ConfirmarFechamento cartao={cartao} quadras={quadras} usuario={quem} onFechar={() => { setErro(false); setFolha(null) }} onReiniciar={() => setFolha('reiniciar')} onErro={() => setErro(true)} />}
    {folha === 'reiniciar' && quadras && <ConfirmarReinicio cartao={cartao} quadras={quadras} podeFechar={podeFecharCartao(quadras)} onFechar={() => setFolha(null)}
      onConfirmar={(casas) => { setFolha(null); fecharEReiniciarCartao(cartao, casas, quadras, quem).catch(() => setErro(true)) }} />}
  </>
}
