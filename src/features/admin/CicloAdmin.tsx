import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from '@/app/icones'
import type { Cartao, Casa } from '@/domain/types'
import { useSessao } from '@/features/auth/AuthProvider'
import ConfirmarAbertura from '@/features/cards/ConfirmarAbertura'
import { useQuadras } from '@/features/cards/useCartao'
import { fecharCartaoManual } from '@/firebase/cards'
import { observarCasas, recalcularContadores, reiniciarCartao } from '@/firebase/houses'

/** Casas de todas as quadras do cartão, na ordem das quadras. */
function useCasasDoCartao(cartaoId: string): Casa[] {
  const quadras = useQuadras(cartaoId)
  const [porQuadra, setPorQuadra] = useState<Record<string, Casa[]>>({})
  const chave = quadras.map((q) => q.id).join('|')
  useEffect(() => {
    const cancelar = quadras.map((q) => observarCasas(cartaoId, q.id, (casas) => setPorQuadra((atual) => ({ ...atual, [q.id]: casas }))))
    return () => cancelar.forEach((c) => c())
    // `quadras` só muda de conteúdo quando `chave` muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartaoId, chave])
  return quadras.flatMap((q) => porQuadra[q.id] ?? [])
}

function ConfirmarReinicio({ cartao, casas, onFechar, onConfirmar }: { cartao: Cartao; casas: Casa[]; onFechar: () => void; onConfirmar: () => void }) {
  const [entendi, setEntendi] = useState(false)
  const carregando = casas.length === 0 && cartao.totalCasas > 0
  const naoVisitar = casas.filter((c) => c.status === 'nao_visitar').length
  const reiniciadas = casas.length - naoVisitar

  return <div className="veu">
    <div className="folha" role="alertdialog" aria-label="Reiniciar território">
      <h2>Reiniciar o cartão {cartao.numero}?</h2>
      <p>
        {naoVisitar > 0
          ? <>As {reiniciadas} casas voltam a <b>Pendente</b>, exceto {naoVisitar} {naoVisitar === 1 ? 'marcada' : 'marcadas'} como <b>Não visitar</b>.</>
          : <>As {reiniciadas} casas voltam a <b>Pendente</b>.</>}
        {' '}O histórico de visitas continua guardado. Esta ação não tem desfazer.
      </p>
      <button type="button" role="checkbox" aria-checked={entendi} className="caixa-ok" onClick={() => setEntendi(!entendi)}>
        <span className={entendi ? 'marca' : 'marca vazia'}>{entendi && <Icone nome="check" className="ic ic-20" />}</span>
        <span>Entendo que o cartão começa um novo ciclo.</span>
      </button>
      <div className="pilha">
        <button type="button" className="btn perigo" aria-disabled={entendi && !carregando ? undefined : true} onClick={() => { if (entendi && !carregando) onConfirmar() }}>Reiniciar território</button>
        <button type="button" className="btn secundario" onClick={onFechar}>Cancelar</button>
      </div>
    </div>
  </div>
}

export default function CicloAdmin({ cartao }: { cartao: Cartao }) {
  const { usuario, membro } = useSessao()
  const casas = useCasasDoCartao(cartao.id)
  const [folha, setFolha] = useState<'abrir' | 'reiniciar' | null>(null)
  const [erro, setErro] = useState(false)
  const aberto = cartao.estado === 'aberto'
  const quem = usuario ? { uid: usuario.uid, nome: membro?.nome ?? usuario.nome } : null

  /** A escrita offline não resolve até haver rede, então a tela não espera por ela. */
  function gravar(p: Promise<unknown>) {
    setErro(false)
    p.catch(() => setErro(true))
  }

  return <>
    <h2 className="titulo-secao divisor" id="ciclo">Ciclo <small>Cartão {cartao.numero}</small></h2>
    {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p><b>Não foi possível salvar</b>Tente de novo.</p></div>}
    <div className="painel-caixa">
      <p style={{ marginBottom: 14 }}>
        <span className="estado">
          <Icone nome={aberto ? 'falado' : 'cadeado'} className={aberto ? 'ic c-falado' : 'ic'} />
          {aberto ? 'Aberto' : 'Fechado'} · ciclo {cartao.ciclo} · {cartao.resolvidas} de {cartao.totalCasas} casas
        </span>
      </p>
      <Link className="btn suave medio" to={`/admin/cartao/${cartao.id}/historico`} style={{ marginBottom: 14 }}>
        <Icone nome="historico" className="ic ic-20" />Ver quando foi aberto e fechado
      </Link>
      <div className="pilha">
        <button type="button" className="btn secundario" aria-disabled={aberto ? undefined : true}
          onClick={() => { if (aberto && quem) gravar(fecharCartaoManual(cartao, quem)) }}>Fechar cartão</button>
        <button type="button" className="btn secundario" aria-disabled={aberto ? true : undefined}
          onClick={() => { if (!aberto) setFolha('abrir') }}>Abrir cartão</button>
        {aberto && <p style={{ color: 'var(--texto-suave)', marginTop: -4 }}>Só administradores abrem cartões. Abrir só fica disponível com o cartão fechado, e fica registrado quem abriu.</p>}
        <button type="button" className="btn perigo" onClick={() => setFolha('reiniciar')}>Reiniciar território</button>
        <p style={{ color: 'var(--texto-suave)', marginTop: -4 }}>Todas as casas voltam a Pendente, menos as de Não visitar. O histórico continua guardado.</p>
        <button type="button" className="btn secundario" onClick={() => gravar(recalcularContadores(cartao.id))}>Recalcular contadores</button>
        <p style={{ color: 'var(--texto-suave)', marginTop: -4 }}>Use se o total de casas parecer errado.</p>
      </div>
    </div>

    {folha === 'abrir' && quem && <ConfirmarAbertura cartao={cartao} uid={quem.uid} nome={quem.nome} onFechar={() => setFolha(null)} />}
    {folha === 'reiniciar' && quem && <ConfirmarReinicio cartao={cartao} casas={casas} onFechar={() => setFolha(null)}
      onConfirmar={() => { setFolha(null); gravar(reiniciarCartao(cartao, casas, quem)) }} />}
  </>
}
