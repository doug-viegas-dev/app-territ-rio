import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Icone } from './icones'

type Estado = { falhou: boolean }

export default class ErroDeLeitura extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { falhou: false }

  static getDerivedStateFromError(): Estado {
    return { falhou: true }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error(erro, info.componentStack)
  }

  render() {
    if (!this.state.falhou) return this.props.children
    return <>
      <header className="topo simples"><div className="topo-linha"><h1>Meu Território</h1></div></header>
      <div className="rolagem">
        <div className="aviso erro" role="alert">
          <Icone nome="aviso" className="ic ic-28" />
          <p>
            <b>Não foi possível carregar</b>
            Confira a conexão. Se a pessoa que cuida do app desativou o seu acesso, peça a ela para liberar de novo.
            <span className="acoes">
              <button type="button" className="btn primario medio auto" onClick={() => this.setState({ falhou: false })}>Tentar de novo</button>
            </span>
          </p>
        </div>
      </div>
    </>
  }
}
