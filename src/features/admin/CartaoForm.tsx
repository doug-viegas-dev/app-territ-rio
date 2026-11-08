import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from '@/app/icones'
import { useOnline } from '@/app/useOnline'
import { useSessao } from '@/features/auth/AuthProvider'
import { atualizarCartao, criarCartao } from '@/firebase/cards'
import { enviarArquivosDoCartao } from '@/firebase/storage'
import { pdfParaImagem } from './pdfParaImagem'

type Mapa = { arquivo: File; imagem: Blob; paginas: number }
const tamanho = (bytes: number) => `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`

export default function CartaoForm({ onCriado, onCancelar }: { onCriado?: () => void; onCancelar?: () => void } = {}) {
  const emFolha = onCancelar !== undefined
  const { usuario, membro } = useSessao()
  const online = useOnline()
  const entrada = useRef<HTMLInputElement>(null)
  const [numero, setNumero] = useState('')
  const [titulo, setTitulo] = useState('')
  const [mapsUrl, setMapsUrl] = useState('')
  const [mapa, setMapa] = useState<Mapa | null>(null)
  const [lendo, setLendo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [criado, setCriado] = useState<{ id: string; numero: string } | null>(null)
  // Cartão já criado cujo mapa não subiu: a nova tentativa só envia o mapa, para não duplicar o cartão.
  const pendente = useRef<{ id: string; numero: string } | null>(null)

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return
    setErro(null)
    setLendo(true)
    try {
      setMapa({ arquivo, ...(await pdfParaImagem(arquivo)) })
    } catch {
      setMapa(null)
      setErro('Não foi possível ler este PDF. Escolha outro arquivo.')
    } finally {
      setLendo(false)
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!usuario || enviando || lendo || !online) return
    if (!numero.trim() || !titulo.trim()) return setErro('Informe o número e o título do cartão.')
    setErro(null)
    setEnviando(true)
    try {
      const existente = pendente.current
      const id = existente?.id ?? await criarCartao({ numero: numero.trim(), titulo: titulo.trim(), ...(mapsUrl.trim() && { mapsUrl: mapsUrl.trim() }) }, { uid: usuario.uid, nome: membro?.nome ?? usuario.nome })
      pendente.current = { id, numero: existente?.numero ?? numero.trim() }
      if (mapa) await atualizarCartao(id, await enviarArquivosDoCartao(id, { pdf: mapa.arquivo, imagem: mapa.imagem }))
      pendente.current = null
      setCriado({ id, numero: existente?.numero ?? numero.trim() })
      setNumero('')
      setTitulo('')
      setMapsUrl('')
      setMapa(null)
      onCriado?.()
    } catch {
      setErro(pendente.current
        ? `O cartão ${pendente.current.numero} foi criado, mas o mapa não foi enviado. Confira a conexão e toque em Criar cartão de novo para enviar o mapa.`
        : 'Não foi possível criar o cartão. Confira a conexão e tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return <>
    {emFolha ? <h2>Novo cartão</h2> : <h2 className="titulo-secao divisor" id="cartoes">Novo cartão</h2>}
    {criado && <div className="aviso" role="status" style={{ background: 'var(--superficie)', borderColor: 'var(--st-falado)' }}>
      <Icone nome="falado" className="ic c-falado" />
      <p><b>Cartão {criado.numero} criado</b>Ele começa fechado. Um administrador precisa abri-lo para registrar visitas. <Link className="btn link" style={{ minHeight: 40 }} to={`/cartao/${criado.id}`}>Ver cartão</Link></p>
    </div>}
    <form className={emFolha ? undefined : 'painel-caixa'} onSubmit={(e) => void salvar(e)}>
      <div className="entrada-grupo" style={{ gridTemplateColumns: '96px 1fr' }}>
        <div className="campo"><label htmlFor="cartao-numero">Número</label><input id="cartao-numero" className="entrada" value={numero} onChange={(e) => setNumero(e.target.value)} /></div>
        <div className="campo"><label htmlFor="cartao-titulo">Título</label><input id="cartao-titulo" className="entrada" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
      </div>
      <div className="campo"><label htmlFor="cartao-maps">Link do Google Maps</label><input id="cartao-maps" className="entrada" inputMode="url" placeholder="Cole o link aqui" value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} /></div>
      <div className="campo">
        <span className="rotulo-campo">Mapa do cartão (PDF)</span>
        <input ref={entrada} type="file" accept="application/pdf" hidden aria-label="Arquivo PDF do mapa" onChange={(e) => void escolher(e.target.files?.[0])} />
        {mapa && <div className="aviso" style={{ margin: 0, background: 'var(--superficie)' }}>
          <Icone nome="arquivo" />
          <p><b>{mapa.arquivo.name}</b>{mapa.paginas} {mapa.paginas === 1 ? 'página' : 'páginas'} · {tamanho(mapa.arquivo.size)}</p>
        </div>}
        {mapa && mapa.paginas > 1 && <div className="aviso" role="status" style={{ margin: 0 }}>
          <Icone nome="info" />
          <p>Este PDF tem várias páginas. Só a primeira página será usada como imagem do mapa.</p>
        </div>}
        <button type="button" className="btn secundario medio" onClick={() => entrada.current?.click()}><Icone nome="upload" />{lendo ? 'Lendo o PDF…' : mapa ? 'Trocar arquivo' : 'Escolher arquivo'}</button>
      </div>
      {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
      {!online && <p style={{ color: 'var(--texto-suave)', marginBottom: 12 }}>Sem internet. Conecte-se para criar um cartão.</p>}
      <div className={emFolha ? 'pilha' : undefined}>
        <button type="submit" className="btn primario" aria-disabled={!online || enviando || lendo ? true : undefined}>{enviando ? 'Criando…' : 'Criar cartão'}</button>
        {onCancelar && <button type="button" className="btn secundario" onClick={onCancelar}>Cancelar</button>}
      </div>
    </form>
  </>
}
