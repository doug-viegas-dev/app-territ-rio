import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icone } from '@/app/icones'
import { useOnline } from '@/app/useOnline'
import { bloqueiosDoCartao, ExclusaoBloqueada, TEXTOS_BLOQUEIO } from '@/domain/exclusao'
import type { Cartao, Quadra } from '@/domain/types'
import { cartaoTemCasas, excluirCartao } from '@/firebase/cards'
import { apagarArquivosDoCartao } from '@/firebase/storage'
import { textoDeErro } from './erros'

export function ExcluirCartao({ cartao, quadras }: { cartao: Cartao; quadras: Quadra[] | null }) {
  const online = useOnline()
  const navigate = useNavigate()
  const botao = useRef<HTMLButtonElement>(null)
  const cancelar = useRef<HTMLButtonElement>(null)
  const [aberta, setAberta] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [casas, setCasas] = useState<'verificando' | 'com' | 'sem'>('verificando')

  const bloqueioEstado = quadras ? bloqueiosDoCartao(cartao, quadras)[0] : undefined
  const verificar = quadras !== null && !bloqueioEstado && online

  // Pergunta ao servidor se há casas (mesmo marcadas "não visitar"). Falha na leitura não bloqueia: a confirmação refaz a checagem.
  useEffect(() => {
    if (!verificar) return
    let ativo = true
    cartaoTemCasas(cartao.id).then((tem) => ativo && setCasas(tem ? 'com' : 'sem'), () => ativo && setCasas('sem'))
    return () => { ativo = false }
  }, [verificar, cartao.id])

  useEffect(() => { if (aberta) cancelar.current?.focus() }, [aberta])

  let motivo: string | null = null
  if (quadras === null) motivo = 'Aguarde: ainda estamos carregando as quadras do cartão.'
  else if (bloqueioEstado) motivo = TEXTOS_BLOQUEIO[`cartao.${bloqueioEstado}`]
  else if (!online) motivo = 'Precisa de internet.'
  else if (casas === 'verificando') motivo = 'Verificando…'
  else if (casas === 'com') motivo = TEXTOS_BLOQUEIO['cartao.casas']

  function fechar() {
    setAberta(false)
    setErro(null)
    botao.current?.focus()
  }

  async function confirmar() {
    if (enviando) return
    setEnviando(true)
    setErro(null)
    try {
      await excluirCartao(cartao.id)
    } catch (e) {
      setEnviando(false)
      return setErro(e instanceof ExclusaoBloqueada
        ? TEXTOS_BLOQUEIO[`cartao.${e.motivo}`]
        : textoDeErro(e, 'Não foi possível excluir o cartão. Confira a conexão e tente de novo.'))
    }
    let arquivosFicaram = false
    try { await apagarArquivosDoCartao(cartao.id) } catch { arquivosFicaram = true }
    navigate('/admin', { state: { aba: 'cartoes', excluido: cartao.numero, ...(arquivosFicaram && { arquivosFicaram: true }) } })
  }

  return <>
    <p>Exclui o cartão {cartao.numero} e o histórico dele. Só é possível quando o cartão está fechado, vazio e sem volta aberta.</p>
    <button ref={botao} type="button" className="btn perigo" aria-disabled={motivo ? true : undefined} onClick={() => { if (!motivo) setAberta(true) }}><Icone nome="lixeira" className="ic ic-20" />Excluir cartão</button>
    {motivo && <p style={{ color: 'var(--texto-suave)', marginTop: 8 }}>{motivo}</p>}
    {aberta && <div className="veu">
      <div className="folha" role="dialog" aria-label="Excluir cartão">
        <h2>Excluir o cartão {cartao.numero}?</h2>
        <p>O cartão <b>{cartao.numero} · {cartao.titulo}</b>, as quadras vazias e o histórico de aberturas e fechamentos serão apagados. Não dá para desfazer.</p>
        {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
        <div className="pilha">
          <button type="button" className="btn perigo" disabled={enviando} onClick={() => void confirmar()}><Icone nome="lixeira" className="ic ic-20" />{enviando ? 'Excluindo…' : `Excluir cartão ${cartao.numero}`}</button>
          <button ref={cancelar} type="button" className="btn secundario" onClick={fechar}>Cancelar</button>
        </div>
      </div>
    </div>}
  </>
}
