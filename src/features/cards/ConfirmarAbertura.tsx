import { useState } from 'react'
import { Icone } from '@/app/icones'
import { abrirCartaoManual } from '@/firebase/cards'
import type { Cartao, Quadra } from '@/domain/types'

const data = (ms: number) => new Date(ms).toLocaleDateString('pt-BR')
const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export default function ConfirmarAbertura({ cartao, nome, uid, quadras, onFechar }: { cartao: Cartao; nome: string; uid: string; quadras: Quadra[] | null; onFechar: () => void }) {
  const [agora] = useState(() => Date.now())
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(false)

  async function abrir() {
    // Com a lista ainda chegando, abrir zeraria só parte das quadras.
    if (quadras === null) return
    setEnviando(true)
    setErro(false)
    try {
      await abrirCartaoManual(cartao, { uid, nome }, quadras)
      onFechar()
    } catch {
      setErro(true)
      setEnviando(false)
    }
  }

  return <div className="veu">
    <div className="folha" role="dialog" aria-label="Abrir cartão">
      <h2>Abrir o cartão {cartao.numero}?</h2>
      <p>Depois de aberto, qualquer pessoa registra visitas. Fica registrado que foi você, <b>{nome}</b>, em {data(agora)} às {hora(agora)}.</p>
      {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p><b>Não foi possível abrir</b>Tente de novo.</p></div>}
      <div className="pilha">
        <button type="button" className="btn primario" onClick={() => void abrir()} disabled={enviando || quadras === null}>Abrir cartão</button>
        <button type="button" className="btn secundario" onClick={onFechar}>Cancelar</button>
      </div>
    </div>
  </div>
}
