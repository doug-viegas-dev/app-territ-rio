import { useRef } from 'react'
import { Icone } from '@/app/icones'
import type { Mapa } from './useMapa'

const tamanho = (bytes: number) => `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`

/** Campo de PDF do mapa. `semInternet` deixa o botão desabilitado e escreve o motivo. */
export default function CampoMapa({ mapa, lendo, erro, onEscolher, semInternet }: {
  mapa: Mapa | null
  lendo: boolean
  erro: string | null
  onEscolher: (arquivo: File | undefined) => void
  semInternet?: boolean
}) {
  const entrada = useRef<HTMLInputElement>(null)
  return <div className="campo">
    <span className="rotulo-campo">Mapa do cartão (PDF)</span>
    <input ref={entrada} type="file" accept="application/pdf" hidden aria-label="Arquivo PDF do mapa" onChange={(e) => { onEscolher(e.target.files?.[0]); e.target.value = '' }} />
    {mapa && <div className="aviso" style={{ margin: 0, background: 'var(--superficie)' }}>
      <Icone nome="arquivo" />
      <p><b>{mapa.arquivo.name}</b>{mapa.paginas} {mapa.paginas === 1 ? 'página' : 'páginas'} · {tamanho(mapa.arquivo.size)}</p>
    </div>}
    {mapa && mapa.paginas > 1 && <div className="aviso" role="status" style={{ margin: 0 }}>
      <Icone nome="info" />
      <p>Este PDF tem várias páginas. Só a primeira página será usada como imagem do mapa.</p>
    </div>}
    {erro && <div className="aviso erro" role="alert" style={{ margin: 0 }}><Icone nome="aviso" /><p>{erro}</p></div>}
    <button type="button" className="btn secundario medio" aria-disabled={semInternet ? true : undefined} onClick={() => { if (!semInternet) entrada.current?.click() }}><Icone nome="upload" />{lendo ? 'Lendo o PDF…' : mapa ? 'Trocar arquivo' : 'Escolher arquivo'}</button>
    {semInternet && <p style={{ color: 'var(--texto-suave)', marginTop: 6 }}>Precisa de internet.</p>}
  </div>
}
