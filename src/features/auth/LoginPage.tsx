import { useState } from 'react'
import { entrarNaDemo } from '@/demo/modo'
import { entrarComGoogle } from '@/firebase/auth'
import Logo from '@/app/Logo'

export function Marca() {
  return <Logo tamanho={104} className="auth-marca" />
}

function GoogleG() {
  return <svg className="auth-google" aria-hidden="true" viewBox="0 0 48 48">
    <path fill="#4285F4" d="M43.6 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11a9.4 9.4 0 0 1-4.08 6.16v5.04h6.62c3.88-3.58 6.06-8.84 6.06-15.21Z" />
    <path fill="#34A853" d="M24 44c5.4 0 9.93-1.79 13.24-4.84l-6.62-5.04c-1.83 1.23-4.17 1.96-6.62 1.96-5.22 0-9.64-3.52-11.22-8.26H5.94v5.2A20 20 0 0 0 24 44Z" />
    <path fill="#FBBC05" d="M12.78 27.82a12 12 0 0 1 0-7.64v-5.2H5.94a20 20 0 0 0 0 18.04l6.84-5.2Z" />
    <path fill="#EA4335" d="M24 12.08c2.94 0 5.58 1.01 7.66 3l5.74-5.74C33.92 5.98 29.4 4 24 4A20 20 0 0 0 5.94 14.98l6.84 5.2c1.58-4.74 6-8.1 11.22-8.1Z" />
  </svg>
}

export default function LoginPage() {
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState(false)

  async function entrar() {
    setEntrando(true)
    setErro(false)
    try {
      await entrarComGoogle()
    } catch {
      setErro(true)
      setEntrando(false)
    }
  }

  return <main className="auth-tela">
    <div className="auth-rolagem">
      <div className="auth-centro">
        <Marca />
        <h1>Meu Território</h1>
        <p>Registre as casas de cada quadra e acompanhe o território da congregação.</p>
      </div>
      {erro && <div className="auth-erro" role="alert"><strong>Não foi possível entrar</strong><br />Confira a conexão e tente de novo.</div>}
    </div>
    <footer className="auth-rodape auth-pilha">
      <button className="auth-botao" type="button" onClick={entrar} disabled={entrando}>
        {!entrando && <GoogleG />}{entrando ? 'Entrando…' : 'Entrar com Google'}
      </button>
      <button className="auth-botao auth-secundario" type="button" onClick={entrarNaDemo} disabled={entrando}>Ver demonstração</button>
      <p className="auth-nota auth-nota-demo">A demonstração não pede login. Os dados são fictícios e ficam só neste aparelho.</p>
      <p className="auth-nota">Ferramenta feita pela e para a congregação. Não é um app oficial.</p>
    </footer>
  </main>
}
