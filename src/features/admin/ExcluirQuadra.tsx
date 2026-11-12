import { useEffect, useRef, useState } from 'react'
import { Icone } from '@/app/icones'
import { useOnline } from '@/app/useOnline'
import { bloqueioDaQuadra, ExclusaoBloqueada, TEXTOS_BLOQUEIO } from '@/domain/exclusao'
import type { Quadra } from '@/domain/types'
import { excluirQuadra, quadraTemCasas } from '@/firebase/blocks'
import { textoDeErro } from './erros'

export function ExcluirQuadra({ cartaoId, quadra, onExcluida }: { cartaoId: string; quadra: Quadra; onExcluida: () => void }) {
  const online = useOnline()
  const botao = useRef<HTMLButtonElement>(null)
  const cancelar = useRef<HTMLButtonElement>(null)
  const [aberta, setAberta] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [casas, setCasas] = useState<'verificando' | 'com' | 'sem'>('verificando')

  const bloqueioEstado = bloqueioDaQuadra(quadra)
  const verificar = !bloqueioEstado && online

  // Pergunta ao servidor se há casas (mesmo marcadas "não visitar"). Falha na leitura não bloqueia: a confirmação refaz a checagem.
  useEffect(() => {
    if (!verificar) return
    let ativo = true
    quadraTemCasas(cartaoId, quadra.id).then((tem) => ativo && setCasas(tem ? 'com' : 'sem'), () => ativo && setCasas('sem'))
    return () => { ativo = false }
  }, [verificar, cartaoId, quadra.id])

  useEffect(() => { if (aberta) cancelar.current?.focus() }, [aberta])

  let motivo: string | null = null
  if (bloqueioEstado) motivo = TEXTOS_BLOQUEIO[`quadra.${bloqueioEstado}`]
  else if (!online) motivo = 'Precisa de internet.'
  else if (casas === 'verificando') motivo = 'Verificando…'
  else if (casas === 'com') motivo = TEXTOS_BLOQUEIO['quadra.casas']

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
      await excluirQuadra(cartaoId, quadra.id)
    } catch (e) {
      setEnviando(false)
      const code = typeof e === 'object' && e !== null ? (e as { code?: string }).code : undefined
      return setErro(e instanceof ExclusaoBloqueada
        ? TEXTOS_BLOQUEIO[`quadra.${e.motivo === 'casas' ? 'casas' : 'volta'}`]
        : code === 'not-found'
          ? 'Este item foi removido por outra pessoa.'
          : textoDeErro(e, 'Não foi possível excluir a quadra. Confira a conexão e tente de novo.'))
    }
    onExcluida()
  }

  return <>
    <button ref={botao} type="button" className="btn perigo" aria-disabled={motivo ? true : undefined} onClick={() => { if (!motivo) setAberta(true) }}><Icone nome="lixeira" className="ic ic-20" />Excluir quadra</button>
    {motivo && <p style={{ color: 'var(--texto-suave)', marginTop: 8 }}>{motivo}</p>}
    {aberta && <div className="veu">
      <div className="folha" role="dialog" aria-label="Confirmar exclusão da quadra">
        <h2>Excluir {quadra.rotulo}?</h2>
        <p>A quadra <b>{quadra.rotulo}</b> e o histórico de voltas dela serão apagados. Não dá para desfazer.</p>
        {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p>{erro}</p></div>}
        <div className="pilha">
          <button type="button" className="btn perigo" disabled={enviando} onClick={() => void confirmar()}><Icone nome="lixeira" className="ic ic-20" />{enviando ? 'Excluindo…' : `Excluir ${quadra.rotulo}`}</button>
          <button ref={cancelar} type="button" className="btn secundario" onClick={fechar}>Cancelar</button>
        </div>
      </div>
    </div>}
  </>
}
