import { useEffect, useRef, useState } from 'react'
import { Icone } from '@/app/icones'
import { useOnline } from '@/app/useOnline'
import { ExclusaoBloqueada, TEXTOS_BLOQUEIO } from '@/domain/exclusao'
import { ruasDaQuadra } from '@/domain/ruas'
import type { Quadra } from '@/domain/types'
import { validarRua } from '@/domain/validacao'
import { removerRua, renomearRua, RenomeacaoIncompleta } from '@/firebase/blocks'
import { useCasas } from '@/features/houses/useCasas'
import { textoDeErro } from './erros'

function FolhaRenomear({ cartaoId, quadra, rua, todas, onFechar }: { cartaoId: string; quadra: Quadra; rua: string; todas: string[]; onFechar: () => void }) {
  const [nome, setNome] = useState(rua)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function confirmar() {
    if (enviando) return
    const msg = validarRua(nome, todas, rua)
    if (msg) return setErro(msg)
    const novo = nome.trim()
    // Mesmo nome, mesmas maiúsculas: nada a gravar.
    if (novo === rua) return onFechar()
    setEnviando(true)
    setErro(null)
    try {
      await renomearRua(cartaoId, quadra.id, rua, novo)
    } catch (e) {
      setEnviando(false)
      return setErro(e instanceof RenomeacaoIncompleta
        ? 'Parte das casas foi atualizada. Toque em Renomear de novo para terminar.'
        : textoDeErro(e, 'Não foi possível renomear a rua. Tente de novo.'))
    }
    onFechar()
  }

  return <div className="veu">
    <div className="folha" role="dialog" aria-label="Renomear rua">
      <h2>Renomear rua</h2>
      <p>As casas desta rua passam a usar o novo nome.</p>
      <div className="campo">
        <label htmlFor="renomear-rua">Nome da rua</label>
        <input id="renomear-rua" className="entrada" value={nome} onChange={(e) => { setNome(e.target.value); setErro(null) }} />
      </div>
      {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
      <div className="pilha">
        <button type="button" className="btn primario" disabled={enviando} onClick={() => void confirmar()}>{enviando ? 'Renomeando…' : 'Renomear'}</button>
        <button type="button" className="btn secundario" onClick={onFechar}>Cancelar</button>
      </div>
    </div>
  </div>
}

function FolhaRemover({ cartaoId, quadra, rua, onFechar }: { cartaoId: string; quadra: Quadra; rua: string; onFechar: (removida: boolean) => void }) {
  const cancelar = useRef<HTMLButtonElement>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => { cancelar.current?.focus() }, [])

  async function confirmar() {
    if (enviando) return
    setEnviando(true)
    setErro(null)
    try {
      await removerRua(cartaoId, quadra.id, rua)
    } catch (e) {
      setEnviando(false)
      const code = typeof e === 'object' && e !== null ? (e as { code?: string }).code : undefined
      return setErro(e instanceof ExclusaoBloqueada
        ? TEXTOS_BLOQUEIO['rua.casas']
        : code === 'not-found'
          ? 'Este item foi removido por outra pessoa.'
          : textoDeErro(e, 'Não foi possível remover a rua. Confira a conexão e tente de novo.'))
    }
    onFechar(true)
  }

  return <div className="veu">
    <div className="folha" role="dialog" aria-label="Confirmar remoção da rua">
      <h2>Remover {rua}?</h2>
      <p>A rua <b>{rua}</b> sai da lista desta quadra. Nenhuma casa é apagada.</p>
      {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
      <div className="pilha">
        <button type="button" className="btn perigo" disabled={enviando} onClick={() => void confirmar()}><Icone nome="lixeira" className="ic ic-20" />{enviando ? 'Excluindo…' : `Remover ${rua}`}</button>
        <button ref={cancelar} type="button" className="btn secundario" onClick={() => onFechar(false)}>Cancelar</button>
      </div>
    </div>
  </div>
}

export function RuasDaQuadra({ cartaoId, quadra }: { cartaoId: string; quadra: Quadra }) {
  const online = useOnline()
  const casas = useCasas(cartaoId, quadra.id)
  const [renomear, setRenomear] = useState<string | null>(null)
  const [remover, setRemover] = useState<string | null>(null)
  const ultimo = useRef<HTMLButtonElement | null>(null)

  const ruas = ruasDaQuadra(quadra, casas ?? [])

  function fecharRemover() {
    setRemover(null)
    ultimo.current?.focus()
  }

  return <div className="campo">
    <span className="rotulo-campo">Ruas</span>
    {ruas.length === 0 && <span className="dica">Nenhuma rua ainda.</span>}
    <ul className="lista-simples">
      {ruas.map((rua) => {
        const temCasas = (casas ?? []).some((c) => c.rua === rua)
        const motivoRemover = !online ? 'Precisa de internet.' : temCasas ? TEXTOS_BLOQUEIO['rua.casas'] : null
        return <li key={rua}>
          <b>{rua}</b>
          <div className="pilha">
            <button type="button" className="btn secundario medio" aria-label={`Renomear ${rua}`} aria-disabled={online ? undefined : true} onClick={() => { if (online) setRenomear(rua) }}>Renomear</button>
            <button type="button" className="btn perigo medio" aria-label={`Remover ${rua}`} aria-disabled={motivoRemover ? true : undefined} onClick={(e) => { if (!motivoRemover) { ultimo.current = e.currentTarget; setRemover(rua) } }}><Icone nome="lixeira" className="ic ic-20" />Remover</button>
          </div>
          {motivoRemover && <span className="dica" style={{ display: 'block' }}>{motivoRemover}</span>}
        </li>
      })}
    </ul>
    {renomear !== null && <FolhaRenomear cartaoId={cartaoId} quadra={quadra} rua={renomear} todas={ruas} onFechar={() => setRenomear(null)} />}
    {remover !== null && <FolhaRemover cartaoId={cartaoId} quadra={quadra} rua={remover} onFechar={(feito) => { if (feito) setRemover(null); else fecharRemover() }} />}
  </div>
}
