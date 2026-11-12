import { Icone } from '@/app/icones'
import type { Casa } from '@/domain/types'

export function SeloMarcas({ casa }: { casa: Pick<Casa, 'naoVisitar' | 'estudo'> }) {
  if (!casa.naoVisitar && !casa.estudo) return null
  return (
    <>
      {casa.naoVisitar && (
        <span className="selo c-nao-visitar">
          <Icone nome="nao-visitar" className="ic ic-20" />
          <span>Não visitar</span>
        </span>
      )}
      {casa.estudo && (
        <span className="selo c-estudo">
          <Icone nome="estudo" className="ic ic-20" />
          <span>Estudo</span>
        </span>
      )}
    </>
  )
}
