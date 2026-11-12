import { useState, type FormEvent } from 'react'
import { Icone } from '@/app/icones'
import { useOnline } from '@/app/useOnline'
import type { Cartao } from '@/domain/types'
import { validarCartao } from '@/domain/validacao'
import { useCartoes } from '@/features/cards/useCartoes'
import { atualizarCartao } from '@/firebase/cards'
import { apagarArquivos, enviarArquivosDoCartao } from '@/firebase/storage'
import CampoMapa from './CampoMapa'
import { textoDeErro } from './erros'
import { useMapa } from './useMapa'

export function EditarCartao({ cartao }: { cartao: Cartao }) {
  const online = useOnline()
  const cartoes = useCartoes()
  const { mapa, lendo, erro: erroMapa, escolher, limpar } = useMapa()
  const [numero, setNumero] = useState(cartao.numero)
  const [titulo, setTitulo] = useState(cartao.titulo)
  const [mapsUrl, setMapsUrl] = useState(cartao.mapsUrl ?? '')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (enviando || lendo) return
    setSalvo(false)
    const url = mapsUrl.trim()
    const invalido = validarCartao({ numero, titulo, mapsUrl: url }, cartoes ?? [], cartao.id)
    if (invalido) return setErro(invalido)
    const dados = { numero: numero.trim(), titulo: titulo.trim(), mapsUrl: url || null }
    setErro(null)

    if (!mapa) {
      // A escrita offline não resolve até haver rede, então a tela não espera por ela.
      atualizarCartao(cartao.id, dados).catch((e) => { setSalvo(false); setErro(textoDeErro(e, 'Não foi possível salvar. Tente de novo.')) })
      return setSalvo(true)
    }

    if (!online) return setErro('Precisa de internet.')
    setEnviando(true)
    let novos: { pdfPath: string; imagemPath: string }
    try {
      novos = await enviarArquivosDoCartao(cartao.id, { pdf: mapa.arquivo, imagem: mapa.imagem })
    } catch (e) {
      setEnviando(false)
      return setErro(textoDeErro(e, 'Não foi possível trocar o mapa. O mapa antigo continua valendo.'))
    }
    try {
      await atualizarCartao(cartao.id, { ...dados, ...novos })
    } catch (e) {
      void apagarArquivos([novos.pdfPath, novos.imagemPath]).catch(() => {})
      setEnviando(false)
      return setErro(textoDeErro(e, 'Não foi possível trocar o mapa. O mapa antigo continua valendo.'))
    }
    try { await apagarArquivos([cartao.pdfPath, cartao.imagemPath]) } catch { /* sobra de arquivo antigo não impede o sucesso */ }
    limpar()
    setEnviando(false)
    setSalvo(true)
  }

  return <form onSubmit={(e) => void salvar(e)}>
    <div className="entrada-grupo" style={{ gridTemplateColumns: '96px 1fr' }}>
      <div className="campo"><label htmlFor="editar-numero">Número</label><input id="editar-numero" className="entrada" value={numero} onChange={(e) => { setNumero(e.target.value); setSalvo(false) }} /></div>
      <div className="campo"><label htmlFor="editar-titulo">Título</label><input id="editar-titulo" className="entrada" value={titulo} onChange={(e) => { setTitulo(e.target.value); setSalvo(false) }} /></div>
    </div>
    <div className="campo"><label htmlFor="editar-maps">Link do Google Maps</label><input id="editar-maps" className="entrada" inputMode="url" placeholder="Cole o link aqui" value={mapsUrl} onChange={(e) => { setMapsUrl(e.target.value); setSalvo(false) }} /></div>
    <CampoMapa mapa={mapa} lendo={lendo} erro={erroMapa} onEscolher={(a) => void escolher(a)} semInternet={!online} />
    {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
    {salvo && <div className="aviso" role="status"><Icone nome="check" /><p>Dados salvos.</p></div>}
    <button type="submit" className="btn primario" aria-disabled={enviando || lendo ? true : undefined}>{enviando ? 'Salvando…' : 'Salvar'}</button>
  </form>
}
