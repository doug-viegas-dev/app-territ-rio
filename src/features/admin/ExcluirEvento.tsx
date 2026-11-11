import { useState } from 'react'
import { Icone } from '@/app/icones'
import type { EventoCartao } from '@/domain/types'
import { excluirEvento } from '@/firebase/cards'
import { dataHora, textoEvento, tituloEvento } from './textoEvento'

export function ExcluirEvento({ cartaoId, evento, onFechar }: { cartaoId: string; evento: EventoCartao; onFechar: () => void }) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(false)

  async function excluir() {
    setEnviando(true)
    setErro(false)
    try {
      await excluirEvento(cartaoId, evento.id)
      onFechar()
    } catch {
      setErro(true)
      setEnviando(false)
    }
  }

  return <div className="veu">
    <div className="folha" role="dialog" aria-label="Excluir registro">
      <h2>Excluir este registro?</h2>
      <p><b>{tituloEvento(evento)}</b> · {dataHora(evento.em)}<br />{textoEvento(evento)}</p>
      <p>Ele some do histórico e não dá para desfazer.</p>
      {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p><b>Não foi possível excluir</b>Tente de novo.</p></div>}
      <div className="pilha">
        <button type="button" className="btn perigo" onClick={() => void excluir()} disabled={enviando}>{enviando ? 'Excluindo…' : 'Excluir registro'}</button>
        <button type="button" className="btn secundario" onClick={onFechar}>Cancelar</button>
      </div>
    </div>
  </div>
}
