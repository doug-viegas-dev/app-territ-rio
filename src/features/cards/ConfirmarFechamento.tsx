import { useState } from 'react'
import { Icone } from '@/app/icones'
import { quadrasComRodadaAberta } from '@/domain/rodada'
import type { Cartao, Quadra } from '@/domain/types'
import { fecharCartaoManual } from '@/firebase/cards'
import { encerrarRodada } from '@/firebase/rodadas'

type Usuario = { uid: string; nome: string }

export default function ConfirmarFechamento({ cartao, quadras, usuario, onFechar, onReiniciar, onErro }: { cartao: Cartao; quadras: Quadra[]; usuario: Usuario; onFechar: () => void; onReiniciar: () => void; onErro: () => void }) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(false)
  const abertas = quadrasComRodadaAberta(quadras)
  const comVolta = abertas.length > 0

  async function fechar() {
    setErro(false)
    if (!comVolta) {
      // A escrita offline não resolve até haver rede, então a folha não espera por ela.
      fecharCartaoManual(cartao, usuario, quadras).catch(onErro)
      onFechar()
      return
    }
    setEnviando(true)
    try {
      for (const q of abertas) await encerrarRodada(cartao.id, q, usuario)
    } catch {
      setErro(true)
      setEnviando(false)
      onErro()
      return
    }
    fecharCartaoManual(cartao, usuario, quadras.map((q) => ({ ...q, rodadaAtual: undefined }))).catch(onErro)
    onFechar()
  }

  return <div className="veu">
    <div className="folha" role="dialog" aria-label="Fechar cartão">
      <h2>Fechar o cartão {cartao.numero}?</h2>
      <p>As voltas recomeçam na próxima abertura.</p>
      {comVolta && <p role="status" style={{ color: 'var(--texto-suave)' }}>Volta aberta em: {abertas.map((q) => q.rotulo).join(', ')}.</p>}
      {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p><b>Não foi possível salvar</b>Tente de novo.</p></div>}
      <div className="pilha">
        <button type="button" className="btn primario" style={{ minHeight: 48 }} disabled={enviando} onClick={() => void fechar()}>{comVolta ? 'Encerrar voltas e fechar' : 'Fechar cartão'}</button>
        <button type="button" className="btn secundario" style={{ minHeight: 48 }} disabled={enviando} onClick={onReiniciar}>Fechar e reiniciar</button>
        <button type="button" className="btn link" style={{ minHeight: 48 }} onClick={onFechar}>Cancelar</button>
      </div>
    </div>
  </div>
}
