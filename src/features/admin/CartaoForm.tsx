import { useRef, useState, type FormEvent } from 'react'
import { Icone } from '@/app/icones'
import { useOnline } from '@/app/useOnline'
import { validarCartao } from '@/domain/validacao'
import { useSessao } from '@/features/auth/AuthProvider'
import { useCartoes } from '@/features/cards/useCartoes'
import { atualizarCartao, criarCartao } from '@/firebase/cards'
import { enviarArquivosDoCartao } from '@/firebase/storage'
import CampoMapa from './CampoMapa'
import { useMapa } from './useMapa'

export default function CartaoForm({ onCriado, onCancelar }: { onCriado?: (numero: string) => void; onCancelar?: () => void } = {}) {
  const emFolha = onCancelar !== undefined
  const { usuario, membro } = useSessao()
  const online = useOnline()
  const [numero, setNumero] = useState('')
  const [titulo, setTitulo] = useState('')
  const [mapsUrl, setMapsUrl] = useState('')
  const { mapa, lendo, erro: erroMapa, escolher, limpar } = useMapa()
  const cartoes = useCartoes()
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // Cartão já criado cujo mapa não subiu: a nova tentativa só envia o mapa, para não duplicar o cartão.
  const pendente = useRef<{ id: string; numero: string } | null>(null)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!usuario || enviando || lendo || !online) return
    const invalido = validarCartao({ numero, titulo, mapsUrl }, cartoes ?? [])
    if (invalido) return setErro(invalido)
    setErro(null)
    setEnviando(true)
    try {
      const existente = pendente.current
      const id = existente?.id ?? await criarCartao({ numero: numero.trim(), titulo: titulo.trim(), ...(mapsUrl.trim() && { mapsUrl: mapsUrl.trim() }) }, { uid: usuario.uid, nome: membro?.nome ?? usuario.nome })
      pendente.current = { id, numero: existente?.numero ?? numero.trim() }
      if (mapa) await atualizarCartao(id, await enviarArquivosDoCartao(id, { pdf: mapa.arquivo, imagem: mapa.imagem }))
      pendente.current = null
      setNumero('')
      setTitulo('')
      setMapsUrl('')
      limpar()
      onCriado?.(existente?.numero ?? numero.trim())
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
    <form className={emFolha ? undefined : 'painel-caixa'} onSubmit={(e) => void salvar(e)}>
      <div className="entrada-grupo" style={{ gridTemplateColumns: '96px 1fr' }}>
        <div className="campo"><label htmlFor="cartao-numero">Número</label><input id="cartao-numero" className="entrada" value={numero} onChange={(e) => setNumero(e.target.value)} /></div>
        <div className="campo"><label htmlFor="cartao-titulo">Título</label><input id="cartao-titulo" className="entrada" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
      </div>
      <div className="campo"><label htmlFor="cartao-maps">Link do Google Maps</label><input id="cartao-maps" className="entrada" inputMode="url" placeholder="Cole o link aqui" value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} /></div>
      <CampoMapa mapa={mapa} lendo={lendo} erro={erroMapa} onEscolher={(a) => void escolher(a)} />
      {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
      {!online && <p style={{ color: 'var(--texto-suave)', marginBottom: 12 }}>Sem internet. Conecte-se para criar um cartão.</p>}
      <div className={emFolha ? 'pilha' : undefined}>
        <button type="submit" className="btn primario" aria-disabled={!online || enviando || lendo ? true : undefined}>{enviando ? 'Criando…' : 'Criar cartão'}</button>
        {onCancelar && <button type="button" className="btn secundario" onClick={onCancelar}>Cancelar</button>}
      </div>
    </form>
  </>
}
