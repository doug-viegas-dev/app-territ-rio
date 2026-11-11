import { useState } from 'react'
import { Icone } from '@/app/icones'
import type { EventoCartao } from '@/domain/types'
import { editarEvento } from '@/firebase/cards'
import { textoEvento, tituloEvento } from './textoEvento'

const doisDigitos = (n: number) => String(n).padStart(2, '0')
/** Valor de um campo `datetime-local` (hora local, sem fuso). */
export const paraCampo = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}T${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`
}

export function EditarEvento({ cartaoId, evento, onFechar }: { cartaoId: string; evento: EventoCartao; onFechar: () => void }) {
  const [quando, setQuando] = useState(paraCampo(evento.em))
  const [quem, setQuem] = useState(evento.porNome)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    const em = new Date(quando).getTime()
    if (!quando || Number.isNaN(em)) { setErro('Informe a data e a hora.'); return }
    if (!quem.trim()) { setErro('Informe o nome de quem fez.'); return }
    setEnviando(true)
    setErro(null)
    try {
      await editarEvento(cartaoId, evento.id, { em, porNome: quem })
      onFechar()
    } catch {
      setErro('Não foi possível salvar. Tente de novo.')
      setEnviando(false)
    }
  }

  return <div className="veu">
    <div className="folha" role="dialog" aria-label="Editar registro">
      <h2>Editar registro</h2>
      <p><b>{tituloEvento(evento)}</b> · {textoEvento(evento)}</p>
      <form onSubmit={(e) => void salvar(e)}>
        <div className="campo"><label htmlFor="evento-quando">Data e hora</label><input id="evento-quando" className="entrada" type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} /></div>
        <div className="campo"><label htmlFor="evento-quem">Quem fez</label><input id="evento-quem" className="entrada" value={quem} onChange={(e) => setQuem(e.target.value)} /></div>
        {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
        <div className="pilha">
          <button type="submit" className="btn primario" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar'}</button>
          <button type="button" className="btn secundario" onClick={onFechar}>Cancelar</button>
        </div>
      </form>
    </div>
  </div>
}
