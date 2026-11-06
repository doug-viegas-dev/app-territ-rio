import { Link, useNavigate } from 'react-router-dom'
import { Icone } from '@/app/icones'
import { dispensarAviso, ehIos, ehSafariIos } from './plataforma'
import { useInstalacao } from './useInstalacao'

const Logo = () => <svg width="64" height="64" viewBox="0 0 192 192" aria-hidden="true" style={{ flex: 'none' }}><use href="#i-logo" /></svg>
const Dentro = ({ nome }: { nome: string }) => <span className="dentro"><Icone nome={nome} /></span>

export default function InstalarPage() {
  const { podeInstalar, instalado, instalar } = useInstalacao()
  const navegar = useNavigate()
  const iphone = ehIos()
  const safari = ehSafariIos()

  const agoraNao = () => { dispensarAviso(); navegar('/') }

  return <>
    <header className="topo simples">
      <div className="topo-linha">
        <h1>Instalar o app</h1>
        <Link className="topo-acao" to="/" aria-label="Fechar"><Icone nome="fechar" />Fechar</Link>
      </div>
    </header>

    <div className="rolagem">
      {instalado && <div className="centrado" style={{ paddingTop: 48 }}>
        <Icone nome="falado" className="ic" />
        <h1>App instalado</h1>
        <p>Procure o ícone <b>Território</b> na tela inicial do celular.</p>
      </div>}

      {!instalado && !iphone && <div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
          <Logo />
          <p style={{ fontSize: 18, lineHeight: 1.5 }}>Instale em um toque. O app vai para a tela inicial e funciona sem internet.</p>
        </div>
        <p style={{ color: 'var(--texto-suave)' }}>O Chrome vai pedir uma confirmação. Toque em <b>Instalar</b>.</p>
        <h2 className="titulo-secao" style={{ marginTop: 32 }}>O botão não funcionou?</h2>
        <ol className="passos">
          <li><div>No Chrome, toque no menu <b>três pontos</b> <Dentro nome="pontos" /> no canto de cima.</div></li>
          <li><div>Toque em <b>Instalar app</b> ou em <b>Adicionar à tela inicial</b>.</div></li>
        </ol>
      </div>}

      {!instalado && iphone && safari && <div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
          <Logo />
          <p style={{ fontSize: 18, lineHeight: 1.5 }}>Fica na tela inicial, abre mais rápido e funciona sem internet.</p>
        </div>
        <ol className="passos">
          <li><div>No Safari, toque em <b>Compartilhar</b> <Dentro nome="compartilhar" /> na barra de baixo.</div></li>
          <li><div>Role a lista e toque em <b>Adicionar à Tela de Início</b> <Dentro nome="tela-inicio" />.</div></li>
          <li><div>Toque em <b>Adicionar</b>, no canto de cima. O ícone aparece na tela inicial.</div></li>
        </ol>
        <p style={{ color: 'var(--texto-suave)' }}>Precisa ser no Safari. Em outros navegadores o iPhone não mostra essa opção.</p>
      </div>}

      {!instalado && iphone && !safari && <div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
          <Logo />
          <p style={{ fontSize: 18, lineHeight: 1.5 }}>Para instalar no iPhone, abra este endereço no Safari.</p>
        </div>
        <p style={{ color: 'var(--texto-suave)' }}>Em outros navegadores o iPhone não mostra a opção de adicionar à tela inicial.</p>
      </div>}
    </div>

    <div className="rodape-entrada pilha">
      {instalado && <Link className="btn primario" to="/">Abrir o app</Link>}
      {!instalado && !iphone && podeInstalar && <button type="button" className="btn primario" onClick={() => { void instalar() }}>
        <Icone nome="tela-inicio" />Instalar app
      </button>}
      {!instalado && iphone && safari && <button type="button" className="btn primario" onClick={() => navegar('/')}>Entendi</button>}
      {!instalado && <button type="button" className="btn link" style={{ margin: '0 auto' }} onClick={agoraNao}>Agora não</button>}
    </div>
  </>
}
