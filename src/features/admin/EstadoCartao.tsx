import { useState } from 'react'
import { Icone } from '@/app/icones'
import { useOnline } from '@/app/useOnline'
import { contadoresSuspeitos } from '@/domain/ciclo'
import { contadoresDaQuadraSuspeitos, podeFecharCartao } from '@/domain/rodada'
import type { Cartao, Quadra } from '@/domain/types'
import { useSessao } from '@/features/auth/AuthProvider'
import ConfirmarAbertura from '@/features/cards/ConfirmarAbertura'
import { fecharCartaoManual } from '@/firebase/cards'
import { fecharEReiniciarCartao, recalcularContadores } from '@/firebase/houses'
import { atualizarDadosDoCartao } from '@/firebase/migracao'
import AvisoRodadas from './AvisoRodadas'
import ConfirmarReinicio from './ConfirmarReinicio'

/** `quadras` é `null` enquanto ainda não chegaram: nesse caso nada é fechado. */
export default function EstadoCartao({ cartao, quadras }: { cartao: Cartao; quadras: Quadra[] | null }) {
  const { usuario, membro } = useSessao()
  const [folha, setFolha] = useState<'abrir' | 'reiniciar' | null>(null)
  const [erro, setErro] = useState(false)
  const [resumo, setResumo] = useState<string | null>(null)
  const [atualizando, setAtualizando] = useState(false)
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

  function atualizarDados() {
    if (!online || atualizando || !quem) return
    setErro(false)
    setResumo(null)
    setAtualizando(true)
    atualizarDadosDoCartao(cartao.id, { nome: quem.nome })
      .then((r) => setResumo(r.casas || r.visitas ? `${r.casas} casas e ${r.visitas} visitas atualizadas.` : 'Nada para atualizar.'))
      .catch(() => setErro(true))
      .finally(() => setAtualizando(false))
  }

  return <>
    {erro && <div className="aviso erro" role="alert"><Icone nome="aviso" /><p><b>Não foi possível salvar</b>Tente de novo.</p></div>}
    {contadoresSuspeitos(cartao) && <div className="aviso" role="status"><Icone nome="aviso" className="ic ic-28" /><p><b>Os contadores parecem errados</b>O total ou as casas resolvidas não batem. Use “Recalcular contadores”, com internet.</p></div>}
    {quadras?.some((q) => q.semContadores || contadoresDaQuadraSuspeitos(q)) &&<div className="aviso" role="status"><Icone nome="aviso" className="ic ic-28" /><p>Recalcule os contadores: algumas quadras ainda não têm a contagem de casas.</p></div>}
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
        {rodadaAberta && <AvisoRodadas quadras={quadras} estilo={{ marginTop: -4 }} />}
        {carregandoQuadras && <p role="status" style={{ color: 'var(--texto-suave)', marginTop: -4 }}>Aguarde: ainda estamos carregando as quadras do cartão.</p>}
        <p style={{ color: 'var(--texto-suave)', marginTop: -4 }}>“Fechar e reiniciar” leva todas as casas de volta a Pendente e deixa o cartão fechado. As marcas continuam e o histórico fica guardado.</p>
        <button type="button" className="btn secundario" aria-disabled={aberto ? true : undefined}
          onClick={() => { if (!aberto) setFolha('abrir') }}>Abrir cartão</button>
        {aberto && <p style={{ color: 'var(--texto-suave)', marginTop: -4 }}>Só administradores abrem cartões. Abrir só fica disponível com o cartão fechado, e fica registrado quem abriu.</p>}
        <button type="button" className="btn secundario" aria-disabled={online ? undefined : true} onClick={() => { if (online) gravar(recalcularContadores(cartao.id)) }}>Recalcular contadores</button>
        <p style={{ color: 'var(--texto-suave)', marginTop: -4 }}>{online ? 'Use se o total de casas parecer errado.' : 'Precisa de internet: o cálculo lê todas as casas no servidor.'}</p>
        <button type="button" className="btn secundario" aria-disabled={online && !atualizando ? undefined : true} onClick={atualizarDados}>Atualizar dados</button>
        <p style={{ color: 'var(--texto-suave)', marginTop: -4 }}>{online ? 'Use uma vez em cada cartão depois de uma atualização do app: passa as marcas Não visitar e Estudo para o formato novo e dá prazo ao histórico.' : 'Precisa de internet: a atualização lê as casas e as visitas no servidor.'}</p>
        {resumo && <p role="status">{resumo}</p>}
      </div>
    </div>

    {folha === 'abrir' && quem && <ConfirmarAbertura cartao={cartao} uid={quem.uid} nome={quem.nome} quadras={quadras} onFechar={() => setFolha(null)} />}
    {folha === 'reiniciar' && quem && quadras && <ConfirmarReinicio cartao={cartao} quadras={quadras} podeFechar={podeFechar} onFechar={() => setFolha(null)}
      onConfirmar={(casas) => { setFolha(null); gravar(fecharEReiniciarCartao(cartao, casas, quadras, quem)) }} />}
  </>
}
