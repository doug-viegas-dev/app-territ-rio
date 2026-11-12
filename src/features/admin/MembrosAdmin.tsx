import { useEffect, useRef, useState } from 'react'
import { Icone } from '@/app/icones'
import { useOnline } from '@/app/useOnline'
import type { Papel } from '@/domain/types'
import { validarNomeMembro, validarNovoMembro } from '@/domain/validacao'
import { useSessao } from '@/features/auth/AuthProvider'
import { observarMembros, removerMembro, salvarMembro } from '@/firebase/members'
import { textoDeErro } from './erros'

type Membro = { email: string; nome: string; papel: Papel; ativo: boolean }
const ROTULO_PAPEL: Record<Papel, string> = { admin: 'Administrador', publicador: 'Publicador' }

function FolhaNovoMembro({ existentes, onSalvar, onCancelar }: { existentes: Membro[]; onSalvar: (m: Membro) => void; onCancelar: () => void }) {
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [papel, setPapel] = useState<Papel>('publicador')
  const [erro, setErro] = useState<string | null>(null)

  function salvar() {
    const limpo = email.trim().toLowerCase()
    const msg = validarNovoMembro({ email: limpo, nome }, existentes)
    if (msg) return setErro(msg)
    onSalvar({ email: limpo, nome: nome.trim(), papel, ativo: true })
  }

  return <div className="veu">
    <div className="folha" role="dialog" aria-label="Liberar novo e-mail">
      <h2>Liberar novo e-mail</h2>
      <div className="campo">
        <label htmlFor="membro-email">E-mail do Google</label>
        <input id="membro-email" className="entrada" type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => { setEmail(e.target.value); setErro(null) }} />
      </div>
      <div className="campo">
        <label htmlFor="membro-nome">Nome</label>
        <input id="membro-nome" className="entrada" value={nome} onChange={(e) => { setNome(e.target.value); setErro(null) }} />
      </div>
      <div className="campo">
        <span className="rotulo-campo" id="membro-papel">Papel</span>
        <div className="segmento" role="radiogroup" aria-labelledby="membro-papel">
          {(['publicador', 'admin'] as Papel[]).map((p) => <button key={p} type="button" role="radio" aria-checked={papel === p} className={papel === p ? 'ativo' : ''} onClick={() => setPapel(p)}>{ROTULO_PAPEL[p]}</button>)}
        </div>
      </div>
      {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
      <div className="pilha">
        <button type="button" className="btn primario" onClick={salvar}>Liberar</button>
        <button type="button" className="btn secundario" onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  </div>
}

function FolhaRemoverMembro({ membro, onFechar }: { membro: Membro; onFechar: (removido: boolean) => void }) {
  const cancelar = useRef<HTMLButtonElement>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => { cancelar.current?.focus() }, [])

  async function confirmar() {
    if (enviando) return
    setEnviando(true)
    setErro(null)
    try {
      await removerMembro(membro.email)
    } catch (e) {
      setEnviando(false)
      return setErro(textoDeErro(e, 'Não foi possível remover. Confira a conexão e tente de novo.'))
    }
    onFechar(true)
  }

  return <div className="veu">
    <div className="folha" role="dialog" aria-label={`Remover ${membro.nome}?`}>
      <h2>Remover {membro.nome}?</h2>
      <p>A conta de {membro.nome} deixa de existir. Se a pessoa entrar de novo com o Google, não terá acesso até você liberar o e-mail.</p>
      {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
      <div className="pilha">
        <button type="button" className="btn perigo" disabled={enviando} onClick={() => void confirmar()}><Icone nome="lixeira" className="ic ic-20" />{enviando ? 'Excluindo…' : `Remover ${membro.nome}`}</button>
        <button ref={cancelar} type="button" className="btn secundario" onClick={() => onFechar(false)}>Cancelar</button>
      </div>
    </div>
  </div>
}

function FolhaEditarMembro({ membro, eu, onSalvar, onRemovido, onCancelar }: { membro: Membro; eu: boolean; onSalvar: (m: Membro) => void; onRemovido: () => void; onCancelar: () => void }) {
  const online = useOnline()
  const botaoRemover = useRef<HTMLButtonElement>(null)
  const [nome, setNome] = useState(membro.nome)
  const [papel, setPapel] = useState<Papel>(membro.papel)
  const [erro, setErro] = useState<string | null>(null)
  const [removendo, setRemovendo] = useState(false)

  function salvar() {
    const msg = validarNomeMembro(nome)
    if (msg) return setErro(msg)
    onSalvar({ ...membro, nome: nome.trim(), papel })
  }

  return <div className="veu">
    <div className="folha" role="dialog" aria-label="Editar membro">
      <h2>Editar membro</h2>
      <p className="mail">{membro.email}</p>
      <div className="campo">
        <label htmlFor="editar-membro-nome">Nome</label>
        <input id="editar-membro-nome" className="entrada" value={nome} onChange={(e) => { setNome(e.target.value); setErro(null) }} />
      </div>
      <div className="campo">
        <span className="rotulo-campo" id="editar-membro-papel">Papel</span>
        <div className="segmento" role="radiogroup" aria-labelledby="editar-membro-papel" aria-disabled={eu ? true : undefined}>
          {(['publicador', 'admin'] as Papel[]).map((p) => <button key={p} type="button" role="radio" aria-checked={papel === p} aria-disabled={eu ? true : undefined} className={papel === p ? 'ativo' : ''} onClick={() => { if (!eu) setPapel(p) }}>{ROTULO_PAPEL[p]}</button>)}
        </div>
        {eu && <span className="dica">Você não pode mudar o seu próprio papel.</span>}
      </div>
      {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
      <div className="pilha">
        <button type="button" className="btn primario" onClick={salvar}>Salvar</button>
        <button type="button" className="btn secundario" onClick={onCancelar}>Cancelar</button>
      </div>
      {!eu && <div style={{ marginTop: 16 }}>
        <button ref={botaoRemover} type="button" className="btn perigo" aria-disabled={online ? undefined : true} onClick={() => { if (online) setRemovendo(true) }}><Icone nome="lixeira" className="ic ic-20" />Remover da lista</button>
        {!online && <p style={{ color: 'var(--texto-suave)', marginTop: 8 }}>Precisa de internet.</p>}
      </div>}
    </div>
    {removendo && <FolhaRemoverMembro membro={membro} onFechar={(removido) => { setRemovendo(false); if (removido) onRemovido(); else botaoRemover.current?.focus() }} />}
  </div>
}

export default function MembrosAdmin() {
  const { usuario } = useSessao()
  const [membros, setMembros] = useState<Membro[] | null>(null)
  const [adicionando, setAdicionando] = useState(false)
  const [editando, setEditando] = useState<Membro | null>(null)
  const [erro, setErro] = useState(false)
  const meu = usuario?.email.toLowerCase()

  useEffect(() => observarMembros(setMembros), [])

  /** A escrita offline não resolve até haver rede, então a tela não espera por ela. */
  function gravar(email: string, d: { nome: string; papel: Papel; ativo: boolean }) {
    setErro(false)
    salvarMembro(email, d).catch(() => setErro(true))
  }

  const lista = membros ?? []
  return <>
    <h2 className="titulo-secao" id="membros">Membros <small>{lista.length} {lista.length === 1 ? 'pessoa' : 'pessoas'}</small></h2>
    {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p><b>Não foi possível salvar</b>Tente de novo.</p></div>}
    <div className="painel-caixa" style={{ paddingTop: 6, paddingBottom: 6 }}>
      {lista.map((m) => {
        const eu = m.email === meu
        return <div className="membro" key={m.email}>
          <div>
            <b>{m.nome}</b>
            <span className="mail">{m.email}</span><br />
            <span className="papel">{ROTULO_PAPEL[m.papel]}</span>
            {eu && <small style={{ display: 'block', fontSize: 16, color: 'var(--texto-suave)', marginTop: 4 }}>Você não pode desativar a si mesmo.</small>}
          </div>
          <button type="button" className="btn secundario medio" aria-label={`Editar ${m.nome}`} onClick={() => setEditando(m)}>Editar</button>
          <button
            type="button"
            role="switch"
            aria-checked={m.ativo}
            aria-label={`${m.nome}: ${m.ativo ? 'Ativo' : 'Inativo'}`}
            aria-disabled={eu && m.ativo ? true : undefined}
            className={m.ativo ? 'chave on' : 'chave'}
            onClick={() => { if (!(eu && m.ativo)) gravar(m.email, { nome: m.nome, papel: m.papel, ativo: !m.ativo }) }}
          ><i />{m.ativo ? 'Ativo' : 'Inativo'}</button>
        </div>
      })}
      {membros !== null && lista.length === 0 && <p style={{ padding: '12px 0', color: 'var(--texto-suave)' }}>Nenhum membro ainda.</p>}
    </div>
    <button type="button" className="btn secundario" onClick={() => setAdicionando(true)}><Icone nome="mais" />Liberar novo e-mail</button>
    {editando && <FolhaEditarMembro membro={editando} eu={editando.email === meu} onCancelar={() => setEditando(null)} onRemovido={() => setEditando(null)} onSalvar={(m) => { gravar(m.email, { nome: m.nome, papel: m.papel, ativo: m.ativo }); setEditando(null) }} />}
    {adicionando && <FolhaNovoMembro existentes={lista} onCancelar={() => setAdicionando(false)} onSalvar={(m) => { gravar(m.email, { nome: m.nome, papel: m.papel, ativo: m.ativo }); setAdicionando(false) }} />}
  </>
}
