import { Icone } from '@/app/icones'
import type { Casa } from '@/domain/types'

/** `compacto`: só o ícone; o nome fica para leitor de tela (o estado já aparece na linha). */
export function SeloMarcas({ casa, compacto = false }: { casa: Pick<Casa, 'naoVisitar' | 'estudo'>; compacto?: boolean }) {
  const nome = compacto ? 'so-leitor' : undefined
  if (!casa.naoVisitar && !casa.estudo) return null
  return (
    <>
      {casa.naoVisitar && (
        <span className="selo c-nao-visitar">
          <Icone nome="nao-visitar" className="ic ic-20" />
          <span className={nome}>Não visitar</span>
        </span>
      )}
      {casa.estudo && (
        <span className="selo c-estudo">
          <Icone nome="estudo" className="ic ic-20" />
          <span className={nome}>Estudo</span>
        </span>
      )}
    </>
  )
}
