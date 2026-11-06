import { useState } from 'react'
import { Icone } from '@/app/icones'
import type { Quadra } from '@/domain/types'
import { useCartoes } from '@/features/cards/useCartoes'
import { useQuadras } from '@/features/cards/useCartao'
import { adicionarRua, atualizarQuadra, criarQuadra } from '@/firebase/blocks'
import { ruasDoTexto } from './ruasDoTexto'

const chave = (s: string) => s.toLocaleLowerCase('pt-BR')

function FolhaQuadra({ quadra, onSalvar, onCancelar }: { quadra: Quadra | null; onSalvar: (d: { rotulo: string; ruas: string[] }) => void; onCancelar: () => void }) {
  const [rotulo, setRotulo] = useState(quadra?.rotulo ?? '')
  const [ruas, setRuas] = useState((quadra?.ruas ?? []).join('\n'))
  const [erro, setErro] = useState<string | null>(null)

  function salvar() {
    if (!rotulo.trim()) return setErro('Digite o nome da quadra.')
    onSalvar({ rotulo: rotulo.trim(), ruas: ruasDoTexto(ruas) })
  }

  return <div className="veu">
    <div className="folha" role="dialog" aria-label={quadra ? 'Editar quadra' : 'Nova quadra'}>
      <h2>{quadra ? 'Editar quadra' : 'Nova quadra'}</h2>
      <div className="campo">
        <label htmlFor="quadra-rotulo">Nome da quadra</label>
        <input id="quadra-rotulo" className="entrada" placeholder="Ex.: Quadra 5" value={rotulo} onChange={(e) => { setRotulo(e.target.value); setErro(null) }} />
      </div>
      <div className="campo">
        <label htmlFor="quadra-ruas">Ruas</label>
        <textarea id="quadra-ruas" className="entrada" value={ruas} onChange={(e) => setRuas(e.target.value)} />
        <span className="dica">Uma rua por linha.</span>
      </div>
      {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
      <div className="pilha">
        <button type="button" className="btn primario" onClick={salvar}>Salvar</button>
        <button type="button" className="btn secundario" onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  </div>
}

function FolhaNovaRua({ quadras, onSalvar, onCancelar }: { quadras: Quadra[]; onSalvar: (quadraId: string, rua: string) => void; onCancelar: () => void }) {
  const [quadraId, setQuadraId] = useState(quadras[0]?.id ?? '')
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  function salvar() {
    const limpo = nome.trim()
    if (!limpo) return setErro('Digite o nome da rua.')
    const quadra = quadras.find((q) => q.id === quadraId)
    if (!quadra) return setErro('Escolha a quadra.')
    if (quadra.ruas.some((r) => chave(r) === chave(limpo))) return setErro('Essa rua já existe nesta quadra.')
    onSalvar(quadraId, limpo)
  }

  return <div className="veu">
    <div className="folha" role="dialog" aria-label="Nova rua">
      <h2>Nova rua</h2>
      <div className="campo">
        <span className="rotulo-campo" id="nova-rua-quadra">Em qual quadra</span>
        <div className="chips" role="radiogroup" aria-labelledby="nova-rua-quadra">
          {quadras.map((q) => <button key={q.id} type="button" role="radio" aria-checked={q.id === quadraId} className={q.id === quadraId ? 'chip sel' : 'chip'} onClick={() => setQuadraId(q.id)}>
            {q.id === quadraId && <Icone nome="check" className="ic ic-20" />}{q.rotulo}
          </button>)}
        </div>
      </div>
      <div className="campo">
        <label htmlFor="admin-nova-rua">Nome da rua</label>
        <input id="admin-nova-rua" className="entrada" placeholder="Ex.: Rua das Palmeiras" value={nome} onChange={(e) => { setNome(e.target.value); setErro(null) }} />
      </div>
      {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
      <div className="pilha">
        <button type="button" className="btn primario" onClick={salvar}>Adicionar rua</button>
        <button type="button" className="btn secundario" onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  </div>
}

export default function QuadrasAdmin() {
  const cartoes = useCartoes()
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const cartao = cartoes?.find((c) => c.id === escolhido) ?? cartoes?.[0]
  const quadras = useQuadras(cartao?.id ?? '')
  const [folha, setFolha] = useState<'rua' | 'nova' | Quadra | null>(null)
  const [erro, setErro] = useState(false)

  /** A escrita offline não resolve até haver rede, então a tela não espera por ela. */
  function gravar(p: Promise<unknown>) {
    setErro(false)
    p.catch(() => setErro(true))
    setFolha(null)
  }

  if (!cartao) return <>
    <h2 className="titulo-secao">Quadras e ruas</h2>
    <p style={{ color: 'var(--texto-suave)' }}>Crie um cartão para cadastrar quadras e ruas.</p>
  </>

  return <>
    <h2 className="titulo-secao">Quadras e ruas <small>Cartão {cartao.numero}</small></h2>
    {(cartoes?.length ?? 0) > 1 && <div className="chips" role="radiogroup" aria-label="Cartão" style={{ marginBottom: 12 }}>
      {cartoes?.map((c) => <button key={c.id} type="button" role="radio" aria-checked={c.id === cartao.id} className={c.id === cartao.id ? 'chip sel' : 'chip'} onClick={() => setEscolhido(c.id)}>
        {c.id === cartao.id && <Icone nome="check" className="ic ic-20" />}Cartão {c.numero}
      </button>)}
    </div>}
    {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p><b>Não foi possível salvar</b>Tente de novo.</p></div>}
    <div className="painel-caixa">
      <ul className="lista-simples">
        {quadras.map((q) => <li key={q.id}>
          <button type="button" aria-label={`Editar ${q.rotulo}`} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: 10, textAlign: 'left', minHeight: 48 }} onClick={() => setFolha(q)}>
            <span><b>{q.rotulo}</b><span style={{ display: 'block', color: 'var(--texto-suave)' }}>{q.ruas.join(', ') || 'Nenhuma rua'}</span></span>
            <Icone nome="chev" className="ic" />
          </button>
        </li>)}
        {quadras.length === 0 && <li><span style={{ color: 'var(--texto-suave)' }}>Nenhuma quadra ainda.</span></li>}
      </ul>
      <div className="pilha" style={{ marginTop: 12 }}>
        <button type="button" className="btn secundario medio" onClick={() => setFolha('nova')}><Icone nome="mais" className="ic ic-20" />Adicionar quadra</button>
        <button type="button" className="btn secundario medio" aria-disabled={quadras.length === 0 ? true : undefined} onClick={() => { if (quadras.length) setFolha('rua') }}><Icone nome="mais" className="ic ic-20" />Adicionar rua</button>
      </div>
    </div>

    {folha === 'rua' && <FolhaNovaRua quadras={quadras} onCancelar={() => setFolha(null)} onSalvar={(quadraId, rua) => gravar(adicionarRua(cartao.id, quadraId, rua))} />}
    {folha === 'nova' && <FolhaQuadra quadra={null} onCancelar={() => setFolha(null)} onSalvar={(d) => gravar(criarQuadra(cartao.id, d))} />}
    {folha !== null && typeof folha === 'object' && <FolhaQuadra quadra={folha} onCancelar={() => setFolha(null)} onSalvar={(d) => gravar(atualizarQuadra(cartao.id, folha.id, d))} />}
  </>
}
