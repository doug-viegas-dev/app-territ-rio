import { useState } from 'react'
import { Icone } from '@/app/icones'
import { gerarFaixa } from '@/domain/faixa'

type Paridade = 'todos' | 'pares' | 'impares'
const PARIDADES: { valor: Paridade; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'pares', rotulo: 'Pares' },
  { valor: 'impares', rotulo: 'Ímpares' },
]

const resumo = (n: string[]) => (n.length <= 4 ? n.join(', ') : `${n.slice(0, 3).join(', ')} … ${n[n.length - 1]}`)

type Props = { rua: string; onCriar: (numeros: string[]) => void }

export default function FaixaForm({ rua, onCriar }: Props) {
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [paridade, setParidade] = useState<Paridade>('todos')

  let numeros: string[] = []
  let erro: string | null = null
  if (inicio.trim() && fim.trim()) {
    try {
      numeros = gerarFaixa(Number(inicio), Number(fim), paridade)
      if (!numeros.length) erro = 'Nenhum número nesta faixa. Confira o início e o fim.'
    } catch (e) {
      erro = e instanceof Error && e.message === 'Faixa grande demais'
        ? 'Faixa grande demais. Cadastre até 200 casas por vez.'
        : 'Informe números inteiros, como 100 e 130.'
    }
  }
  const pronta = numeros.length > 0 && !erro
  const criar = () => { if (pronta && rua) onCriar(numeros) }
  const botao = pronta ? `Criar ${numeros.length} ${numeros.length === 1 ? 'casa' : 'casas'}` : 'Criar casas'

  return <>
    <div className="entrada-grupo">
      <div className="campo">
        <label htmlFor="faixa-ini">Início</label>
        <input id="faixa-ini" className="entrada" inputMode="numeric" value={inicio} onChange={(e) => setInicio(e.target.value)} />
      </div>
      <div className="campo">
        <label htmlFor="faixa-fim">Fim</label>
        <input id="faixa-fim" className="entrada" inputMode="numeric" value={fim} onChange={(e) => setFim(e.target.value)} />
      </div>
    </div>
    <div className="campo">
      <span className="rotulo-campo" id="faixa-quais">Quais números</span>
      <div className="segmento" role="radiogroup" aria-labelledby="faixa-quais">
        {PARIDADES.map((p) => <button
          key={p.valor}
          type="button"
          role="radio"
          aria-checked={paridade === p.valor}
          className={paridade === p.valor ? 'ativo' : ''}
          onClick={() => setParidade(p.valor)}
        >{p.rotulo}</button>)}
      </div>
    </div>
    {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
    {pronta && <div className="aviso" role="status" style={{ marginTop: 4 }}>
      <Icone nome="info" />
      <p><b>{numeros.length} {numeros.length === 1 ? 'casa será criada' : 'casas serão criadas'}</b>{resumo(numeros)}, na ordem do menor para o maior, no fim da {rua}.</p>
    </div>}
    <div className="barra-fixa" style={{ paddingTop: 14 }}>
      <div className="pilha">
        <button type="button" className="btn primario" aria-disabled={pronta ? undefined : true} onClick={criar}>{botao}</button>
      </div>
    </div>
  </>
}
