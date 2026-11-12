import { useCallback, useState } from 'react'
import { validarArquivoMapa } from '@/domain/validacao'
import { pdfParaImagem } from './pdfParaImagem'

export type Mapa = { arquivo: File; imagem: Blob; paginas: number }

/** Estado do PDF escolhido para o mapa: valida o arquivo e gera a imagem da primeira página. */
export function useMapa() {
  const [mapa, setMapa] = useState<Mapa | null>(null)
  const [lendo, setLendo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const escolher = useCallback(async (arquivo: File | undefined) => {
    if (!arquivo) return
    const invalido = validarArquivoMapa(arquivo)
    if (invalido) return setErro(invalido)
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
  }, [])

  const limpar = useCallback(() => { setMapa(null); setErro(null) }, [])

  return { mapa, lendo, erro, escolher, limpar }
}
