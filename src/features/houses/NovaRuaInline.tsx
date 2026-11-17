import { useState } from 'react'
import { Icone } from '@/app/icones'
import type { Quadra } from '@/domain/types'
import { adicionarRua } from '@/firebase/blocks'

const chave = (s: string) => s.toLocaleLowerCase('pt-BR')

/** "Nova rua" no fim da lista da quadra: abre o campo no próprio lugar, sem folha. */
export default function NovaRuaInline({ cartaoId, quadra, ruas, onErro }: { cartaoId: string; quadra: Quadra; ruas: string[]; onErro: () => void }) {
  const [aberta, setAberta] = useState(false)
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  function fechar() { setAberta(false); setNome(''); setErro(null) }

  function adicionar() {
    const limpo = nome.trim()
    if (!limpo) return setErro('Digite o nome da rua.')
    if (ruas.some((r) => chave(r) === chave(limpo))) return setErro('Essa rua já existe nesta quadra.')
    adicionarRua(cartaoId, quadra.id, limpo).catch(onErro)
    fechar()
  }

  if (!aberta) return <button type="button" className="btn secundario medio nova-rua-inline" onClick={() => setAberta(true)}><Icone nome="mais" className="ic ic-20" />Nova rua</button>
  return <div className="cadastro-rapido">
    <div className="linha">
      <input
        className="entrada" aria-label="Nome da rua" placeholder="Ex.: Rua das Palmeiras" autoFocus value={nome}
        onChange={(e) => { setNome(e.target.value); setErro(null) }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionar() } }}
      />
      <button type="button" className="btn primario medio auto" onClick={adicionar}>Adicionar rua</button>
    </div>
    {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
    <div className="atalhos"><button type="button" className="btn secundario medio" onClick={fechar}>Cancelar</button></div>
  </div>
}
