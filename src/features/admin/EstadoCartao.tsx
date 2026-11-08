import { useEffect, useState } from 'react'
import { Icone } from '@/app/icones'
import { useFalhaDeLeitura } from '@/app/useFalhaDeLeitura'
import { useOnline } from '@/app/useOnline'
import { contadoresSuspeitos } from '@/domain/ciclo'
import { podeFecharCartao } from '@/domain/rodada'
import type { Cartao, Casa, Quadra } from '@/domain/types'
import { useSessao } from '@/features/auth/AuthProvider'
import ConfirmarAbertura from '@/features/cards/ConfirmarAbertura'
import { fecharCartaoManual } from '@/firebase/cards'
import { fecharEReiniciarCartao, observarCasas, recalcularContadores } from '@/firebase/houses'

/** Casas de todas as quadras recebidas, na ordem das quadras. */
function useCasasDoCartao(cartaoId: string, quadras: Quadra[]): Casa[] {
  const [porQuadra, setPorQuadra] = useState<Record<string, Casa[]>>({})
  const chave = quadras.map((q) => q.id).join('|')
  const falhar = useFalhaDeLeitura()
  useEffect(() => {
    const cancelar = quadras.map((q) => observarCasas(cartaoId, q.id, (casas) => setPorQuadra((atual) => ({ ...atual, [q.id]: casas })), falhar))
    return () => cancelar.forEach((c) => c())
    // `quadras` só muda de conteúdo quando `chave` muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartaoId, chave, falhar])
  return quadras.flatMap((q) => porQuadra[q.id] ?? [])
}

function ConfirmarReinicio({ cartao, casas, podeFechar, onFechar, onConfirmar }: { cartao: Cartao; casas: Casa[]; podeFechar: boolean; onFechar: () => void; onConfirmar: () => void }) {
  const [entendi, setEntendi] = useState(false)
  // Só reinicia com todas as casas na mão: uma lista parcial deixaria quadras sem reiniciar e o contador errado.
  const carregando = casas.length < cartao.totalCasas
  const naoVisitar = casas.filter((c) => c.status === 'nao_visitar').length
  const reiniciadas = casas.length - naoVisitar
  const liberado = entendi && !carregando && podeFechar

  return <div className="veu">
    <div className="folha" role="alertdialog" aria-label="Fechar e reiniciar">
      <h2>Fechar e reiniciar o cartão {cartao.numero}?</h2>
      <p>
        {naoVisitar > 0
          ? <>As {reiniciadas} casas voltam a <b>Pendente</b>, exceto {naoVisitar} {naoVisitar === 1 ? 'marcada' : 'marcadas'} como <b>Não visitar</b>.</>
          : <>As {reiniciadas} casas voltam a <b>Pendente</b>.</>}
        {' '}O histórico de visitas continua guardado. Esta ação não tem desfazer.
      </p>
      <p>O cartão fica <b>fechado</b> depois de reiniciar. Para registrar visitas de novo, um administrador precisa abri-lo.</p>
      {!podeFechar && <p role="status" style={{ color: 'var(--texto-suave)' }}>Encerre as rodadas abertas antes de fechar.</p>}
      {carregando && <p role="status" style={{ color: 'var(--texto-suave)' }}>Aguarde: ainda estamos carregando todas as casas do cartão ({casas.length} de {cartao.totalCasas}). Sem internet, só as quadras já abertas neste aparelho aparecem. Se o total estiver errado, use “Recalcular contadores”.</p>}
      <button type="button" role="checkbox" aria-checked={entendi} className="caixa-ok" onClick={() => setEntendi(!entendi)}>
        <span className={entendi ? 'marca' : 'marca vazia'}>{entendi && <Icone nome="check" className="ic ic-20" />}</span>
        <span>Entendo que o cartão começa um novo ciclo.</span>
      </button>
      <div className="pilha">
        <button type="button" className="btn perigo" aria-disabled={liberado ? undefined : true} onClick={() => { if (liberado) onConfirmar() }}>Fechar e reiniciar</button>
        <button type="button" className="btn secundario" onClick={onFechar}>Cancelar</button>
      </div>
    </div>
  </div>
}

/** `quadras` é `null` enquanto ainda não chegaram: nesse caso nada é fechado. */
export default function EstadoCartao({ cartao, quadras }: { cartao: Cartao; quadras: Quadra[] | null }) {
  const { usuario, membro } = useSessao()
  const casas = useCasasDoCartao(cartao.id, quadras ?? [])
  const [folha, setFolha] = useState<'abrir' | 'reiniciar' | null>(null)
  const [erro, setErro] = useState(false)
  const online = useOnline()
  const aberto = cartao.estado === 'aberto'
  const quem = usuario ? { uid: usuario.uid, nome: membro?.nome ?? usuario.nome } : null
  const carregandoQuadras = quadras === null
  const rodadaAberta = quadras !== null && !podeFecharCartao(quadras)
  const podeFechar = quadras !== null && !rodadaAberta

  /** A escrita offline não resolve até haver rede, então a tela não espera por ela. */
  function gravar(p: Promise<unknown>) {
    setErro(false)
    p.catch(() => setErro(true))
  }

  return <>
    {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p><b>Não foi possível salvar</b>Tente de novo.</p></div>}
    {contadoresSuspeitos(cartao) && <div className="aviso" role="status"><Icone nome="aviso" className="ic ic-28" /><p><b>Os contadores parecem errados</b>O total ou as casas resolvidas não batem. Use “Recalcular contadores”, com internet.</p></div>}
    <div className="painel-caixa">
      <p style={{ marginBottom: 14 }}>
        <span className="estado">
          <Icone nome={aberto ? 'falado' : 'cadeado'} className={aberto ? 'ic c-falado' : 'ic'} />
          {aberto ? 'Aberto' : 'Fechado'} · {cartao.resolvidas} de {cartao.totalCasas} casas
        </span>
      </p>
      <div className="pilha">
        <button type="button" className="btn secundario" aria-disabled={aberto && podeFechar ? undefined : true}
          onClick={() => { if (aberto && podeFechar && quem && quadras) gravar(fecharCartaoManual(cartao, quem, quadras)) }}>Fechar cartão</button>
        <button type="button" className="btn secundario" aria-disabled={podeFechar ? undefined : true}
          onClick={() => { if (podeFechar) setFolha('reiniciar') }}>Fechar e reiniciar</button>
        {rodadaAberta && <p role="status" style={{ color: 'var(--texto-suave)', marginTop: -4 }}>Encerre as rodadas abertas antes de fechar.</p>}
        {carregandoQuadras && <p role="status" style={{ color: 'var(--texto-suave)', marginTop: -4 }}>Aguarde: ainda estamos carregando as quadras do cartão.</p>}
        <p style={{ color: 'var(--texto-suave)', marginTop: -4 }}>“Fechar e reiniciar” leva todas as casas de volta a Pendente, menos as de Não visitar, e deixa o cartão fechado. O histórico continua guardado.</p>
        <button type="button" className="btn secundario" aria-disabled={aberto ? true : undefined}
          onClick={() => { if (!aberto) setFolha('abrir') }}>Abrir cartão</button>
        {aberto && <p style={{ color: 'var(--texto-suave)', marginTop: -4 }}>Só administradores abrem cartões. Abrir só fica disponível com o cartão fechado, e fica registrado quem abriu.</p>}
        <button type="button" className="btn secundario" aria-disabled={online ? undefined : true} onClick={() => { if (online) gravar(recalcularContadores(cartao.id)) }}>Recalcular contadores</button>
        <p style={{ color: 'var(--texto-suave)', marginTop: -4 }}>{online ? 'Use se o total de casas parecer errado.' : 'Precisa de internet: o cálculo lê todas as casas no servidor.'}</p>
      </div>
    </div>

    {folha === 'abrir' && quem && <ConfirmarAbertura cartao={cartao} uid={quem.uid} nome={quem.nome} onFechar={() => setFolha(null)} />}
    {folha === 'reiniciar' && quem && quadras && <ConfirmarReinicio cartao={cartao} casas={casas} podeFechar={podeFechar} onFechar={() => setFolha(null)}
      onConfirmar={() => { setFolha(null); gravar(fecharEReiniciarCartao(cartao, casas, quadras, quem)) }} />}
  </>
}
