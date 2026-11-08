import { Icone } from '@/app/icones'

type Props = { cartaoAberto: boolean; rodadaAberta: boolean; onTentar: () => void }

/** Anotação que falhou. Só oferece "Tentar de novo" quando ainda dá para registrar; senão explica o motivo. */
export default function AvisoNaoEnviado({ cartaoAberto, rodadaAberta, onTentar }: Props) {
  const motivo = !cartaoAberto
    ? 'O cartão foi fechado. Um administrador precisa abri-lo para registrar de novo.'
    : !rodadaAberta ? 'A rodada foi encerrada. Abra a rodada para registrar de novo.' : null
  return <div className="aviso faixa erro" role="alert">
    <Icone nome="aviso" />
    <p>
      <b>A última anotação não foi enviada</b>
      {motivo
        ? <span>{motivo}</span>
        : <>Ela está guardada neste aparelho. <button type="button" className="btn link" style={{ minHeight: 40 }} onClick={onTentar}>Tentar de novo</button></>}
    </p>
  </div>
}
