import { quadrasComRodadaAberta } from '@/domain/rodada'
import type { Cartao, Quadra } from '@/domain/types'
import { fecharCartaoManual } from '@/firebase/cards'
import { encerrarRodada } from '@/firebase/rodadas'

type Usuario = { uid: string; nome: string }

export default function ConfirmarFechamento({ cartao, quadras, usuario, onFechar, onReiniciar, onErro }: { cartao: Cartao; quadras: Quadra[]; usuario: Usuario; onFechar: () => void; onReiniciar: () => void; onErro: () => void }) {
  const abertas = quadrasComRodadaAberta(quadras)
  const comVolta = abertas.length > 0

  function fechar() {
    // As escritas offline não resolvem até haver rede, então a folha não espera por elas.
    // O Firestore mantém a ordem: primeiro encerra as voltas, depois fecha o cartão.
    for (const q of abertas) encerrarRodada(cartao.id, q, usuario).catch(onErro)
    const quadrasFinais = comVolta ? quadras.map((q) => ({ ...q, rodadaAtual: undefined })) : quadras
    fecharCartaoManual(cartao, usuario, quadrasFinais).catch(onErro)
    onFechar()
  }

  return <div className="veu">
    <div className="folha" role="dialog" aria-label="Fechar cartão">
      <h2>Fechar o cartão {cartao.numero}?</h2>
      <p>As voltas recomeçam na próxima abertura.</p>
      {comVolta && <p role="status" style={{ color: 'var(--texto-suave)' }}>Volta aberta em: {abertas.map((q) => q.rotulo).join(', ')}.</p>}
      <div className="pilha">
        <button type="button" className="btn primario" style={{ minHeight: 48 }} onClick={fechar}>{comVolta ? 'Encerrar voltas e fechar' : 'Fechar cartão'}</button>
        <button type="button" className="btn secundario" style={{ minHeight: 48 }} onClick={onReiniciar}>Fechar e reiniciar</button>
        <button type="button" className="btn link" style={{ minHeight: 48 }} onClick={onFechar}>Cancelar</button>
      </div>
    </div>
  </div>
}
