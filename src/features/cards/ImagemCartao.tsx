import { useEffect, useState } from 'react'
import { Icone } from '@/app/icones'
import { urlDaImagem } from '@/firebase/storage'

export default function ImagemCartao({ path, numero }: { path: string; numero: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [falhou, setFalhou] = useState(false)
  const [ampliada, setAmpliada] = useState(false)

  useEffect(() => {
    let vivo = true
    setUrl(null)
    setFalhou(false)
    urlDaImagem(path).then((u) => vivo && setUrl(u), () => vivo && setFalhou(true))
    return () => { vivo = false }
  }, [path])

  if (falhou) return <div className="aviso" role="status"><Icone nome="aviso" className="ic ic-28" /><p><b>Não foi possível carregar o mapa</b>Confira a conexão e abra o cartão de novo.</p></div>
  if (!url) return <div className="esqueleto" style={{ height: 200, borderRadius: 16 }} role="status" aria-label="Carregando o mapa" />

  return <>
    <button type="button" className="mapa" onClick={() => setAmpliada(true)} aria-label={`Ampliar o mapa do cartão ${numero}`}>
      <img src={url} alt={`Mapa do cartão ${numero}`} style={{ display: 'block', width: '100%', height: 'auto' }} />
      <span className="dica-zoom"><Icone nome="ampliar" className="ic ic-20" />Toque para ampliar</span>
    </button>
    {ampliada && <div className="imagem-cheia" role="dialog" aria-label={`Mapa do cartão ${numero}`}>
      <button type="button" className="imagem-cheia-fechar" onClick={() => setAmpliada(false)} aria-label="Fechar mapa"><Icone nome="fechar" className="ic ic-28" /></button>
      <img src={url} alt={`Mapa do cartão ${numero}`} />
    </div>}
  </>
}
