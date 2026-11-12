import { useEffect, useState } from 'react'
import { Icone } from '@/app/icones'
import type { Papel } from '@/domain/types'
import { useSessao } from '@/features/auth/AuthProvider'
import { observarMembros, salvarMembro } from '@/firebase/members'

type Membro = { email: string; nome: string; papel: Papel; ativo: boolean }
const ROTULO_PAPEL: Record<Papel, string> = { admin: 'Administrador', publicador: 'Publicador' }

function FolhaNovoMembro({ existentes, onSalvar, onCancelar }: { existentes: Membro[]; onSalvar: (m: Membro) => void; onCancelar: () => void }) {
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [papel, setPapel] = useState<Papel>('publicador')
  const [erro, setErro] = useState<string | null>(null)

  function salvar() {
    const limpo = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) return setErro('Digite um e-mail válido.')
    if (!nome.trim()) return setErro('Digite o nome da pessoa.')
    if (existentes.some((m) => m.email === limpo)) return setErro('Esse e-mail já está na lista.')
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

export default function MembrosAdmin() {
  const { usuario } = useSessao()
  const [membros, setMembros] = useState<Membro[] | null>(null)
  const [adicionando, setAdicionando] = useState(false)
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
    {adicionando && <FolhaNovoMembro existentes={lista} onCancelar={() => setAdicionando(false)} onSalvar={(m) => { gravar(m.email, { nome: m.nome, papel: m.papel, ativo: m.ativo }); setAdicionando(false) }} />}
  </>
}
