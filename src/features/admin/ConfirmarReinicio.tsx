import { useState } from 'react'
import { Icone } from '@/app/icones'
import { contaNoTotal } from '@/domain/status'
import type { Cartao, Casa, Quadra } from '@/domain/types'
import AvisoRodadas from './AvisoRodadas'
import { useCasasDoCartao } from './useCasasDoCartao'

/** Lê as casas do cartão só enquanto a folha está aberta. */
export default function ConfirmarReinicio({ cartao, quadras, podeFechar, onFechar, onConfirmar }: { cartao: Cartao; quadras: Quadra[]; podeFechar: boolean; onFechar: () => void; onConfirmar: (casas: Casa[]) => void }) {
  const casas = useCasasDoCartao(cartao.id, quadras)
  const [entendi, setEntendi] = useState(false)
  // Só reinicia com todas as casas na mão: uma lista parcial deixaria quadras sem reiniciar e o contador errado.
  // `totalCasas` não inclui as de Não visitar, então compara com as que contam no total.
  const reiniciadas = casas.filter(contaNoTotal).length
  const carregando = reiniciadas < cartao.totalCasas
  const liberado = entendi && !carregando && podeFechar

  return <div className="veu">
    <div className="folha" role="alertdialog" aria-label="Fechar e reiniciar">
      <h2>Fechar e reiniciar o cartão {cartao.numero}?</h2>
      <p>
        As {reiniciadas} casas voltam a <b>Pendente</b>. As marcas de <b>Não visitar</b> e <b>Estudo</b> continuam.
        {' '}O histórico de visitas continua guardado. Esta ação não tem desfazer.
      </p>
      <p>O cartão fica <b>fechado</b> depois de reiniciar. Para registrar visitas de novo, um administrador precisa abri-lo.</p>
      {!podeFechar && <AvisoRodadas quadras={quadras} />}
      {carregando && <p role="status" style={{ color: 'var(--texto-suave)' }}>Aguarde: ainda estamos carregando todas as casas do cartão ({reiniciadas} de {cartao.totalCasas}). Sem internet, só as quadras já abertas neste aparelho aparecem. Se o total estiver errado, use “Recalcular contadores”.</p>}
      <button type="button" role="checkbox" aria-checked={entendi} className="caixa-ok" onClick={() => setEntendi(!entendi)}>
        <span className={entendi ? 'marca' : 'marca vazia'}>{entendi && <Icone nome="check" className="ic ic-20" />}</span>
        <span>Entendo que o cartão volta ao início.</span>
      </button>
      <div className="pilha">
        <button type="button" className="btn perigo" aria-disabled={liberado ? undefined : true} onClick={() => { if (liberado) onConfirmar(casas) }}>Fechar e reiniciar</button>
        <button type="button" className="btn secundario" onClick={onFechar}>Cancelar</button>
      </div>
    </div>
  </div>
}
