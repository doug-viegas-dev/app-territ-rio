import { useRef, useState } from 'react'
import { Icone } from '@/app/icones'
import { soDigitos, validarEntradaRapida } from '@/domain/casa'
import type { Casa, Quadra } from '@/domain/types'
import { criarCasa } from '@/firebase/houses'

export type CasaEsperada = { rua: string; numero?: string; descricao?: string }

type Props = {
  rua: string; quadra: Quadra; casas: Casa[]; cartaoId: string
  onAdicionada: (esperada: CasaEsperada) => void
  onMaisOpcoes: (rua: string) => void
  onErro: () => void
}

/** Campo no fim da rua: digita o número (ou, sem número, uma descrição curta) e a casa entra no fim da rua, sem sair da lista. */
export default function CadastroRapido({ rua, quadra, casas, cartaoId, onAdicionada, onMaisOpcoes, onErro }: Props) {
  const [modo, setModo] = useState<'numero' | 'descricao'>('numero')
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)
  const repetido = modo === 'numero' && texto.trim() !== '' && casas.some((c) => c.rua === rua && c.numero?.trim() === texto.trim())

  function adicionar() {
    const problema = validarEntradaRapida(modo, texto)
    if (problema) return setErro(problema)
    const limpo = texto.trim()
    const esperada: CasaEsperada = modo === 'numero' ? { rua, numero: limpo } : { rua, descricao: limpo }
    // esvazia antes de tudo: um segundo toque em Adicionar não cria a casa duas vezes
    setTexto('')
    setErro(null)
    campo.current?.focus()
    // offline a escrita só resolve com rede: a tela não espera por ela
    criarCasa(cartaoId, quadra.id, esperada, casas, { quadraSemContadores: quadra.semContadores === true }).catch(onErro)
    onAdicionada(esperada)
  }

  const rotulo = modo === 'numero' ? 'Número' : 'Descrição curta'
  return <div className="cadastro-rapido">
    <div className="linha">
      <input
        ref={campo} className="entrada" aria-label={rotulo} placeholder={rotulo} autoComplete="off" value={texto}
        {...(modo === 'numero' ? { inputMode: 'numeric' as const, pattern: '[0-9]*' } : {})}
        onChange={(e) => { setTexto(modo === 'numero' ? soDigitos(e.target.value) : e.target.value); setErro(null) }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionar() } }}
      />
      <button type="button" className="btn primario medio auto" onClick={adicionar}><Icone nome="mais" className="ic ic-20" />Adicionar</button>
    </div>
    {repetido && <div className="aviso" role="status"><Icone nome="info" /><p>Já existe um {texto.trim()} nesta rua. Pode salvar mesmo assim.</p></div>}
    {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
    <div className="atalhos">
      <button type="button" className="btn secundario medio" onClick={() => { setModo(modo === 'numero' ? 'descricao' : 'numero'); setTexto(''); setErro(null) }}>{modo === 'numero' ? 'Sem número' : 'Com número'}</button>
      <button type="button" className="btn secundario medio" onClick={() => onMaisOpcoes(rua)}>Mais opções</button>
    </div>
  </div>
}
