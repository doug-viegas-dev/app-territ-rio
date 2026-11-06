import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from '@/app/icones'
import { dispensarAviso, emModoApp, ehSafariIos, jaDispensado } from './plataforma'
import { useInstalacao } from './useInstalacao'

export default function AvisoInstalar() {
  const { podeInstalar, instalado, instalar } = useInstalacao()
  const [dispensado, setDispensado] = useState(jaDispensado)

  const noIphone = ehSafariIos()
  if (dispensado || instalado || emModoApp() || (!podeInstalar && !noIphone)) return null

  return <div className="aviso">
    <Icone nome="tela-inicio" className="ic ic-28" />
    <p><b>Instale o app no celular</b>Abre mais rápido e funciona sem internet.
      <span className="acoes">
        {noIphone
          ? <Link className="btn link" to="/instalar">Ver como</Link>
          : <button type="button" className="btn primario medio auto" onClick={() => { void instalar() }}>
            <Icone nome="tela-inicio" className="ic ic-20" />Instalar app
          </button>}
      </span>
    </p>
    <button className="fechar" type="button" aria-label="Dispensar aviso" onClick={() => { dispensarAviso(); setDispensado(true) }}>
      <Icone nome="fechar" />
    </button>
  </div>
}
