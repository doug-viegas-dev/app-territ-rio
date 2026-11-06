import { useState } from 'react'
import { entrarComGoogle } from '@/firebase/auth'
import marca from '../../../design/identidade/icone.svg'

export function Marca() {
  return <img className="auth-marca" src={marca} alt="" />
}

export function EstilosAuth() {
  return <style>{`
    html,body,#root{margin:0;min-height:100%}
    .auth-tela{box-sizing:border-box;min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;background:#F6F7FA;color:#252C3B;font:400 16px/1.5 "Nunito Sans",system-ui,sans-serif}
    .auth-tela *{box-sizing:border-box}
    .auth-rolagem{width:100%;max-width:430px;flex:1;margin:0 auto;padding:24px;display:flex;flex-direction:column;justify-content:center;gap:24px}
    .auth-centro{text-align:center}
    .auth-marca{display:block;width:120px;height:120px;margin:0 auto 20px}
    .auth-centro h1{font-size:32px;line-height:1.2;font-weight:600;margin:0 0 10px}
    .auth-centro p{max-width:32ch;margin:0 auto 8px;font-size:18px;line-height:1.5}
    .auth-rodape{width:100%;max-width:430px;margin:0 auto;padding:16px 24px 28px}
    .auth-botao{width:100%;min-height:56px;display:flex;justify-content:center;align-items:center;gap:10px;padding:10px 20px;border:1px solid transparent;border-radius:12px;background:#55658C;color:#fff;font-family:inherit;font-size:18px;font-weight:600;line-height:1.3;text-decoration:none;cursor:pointer}
    .auth-botao:focus-visible{outline:3px solid #252C3B;outline-offset:3px}
    .auth-secundario{background:transparent;border-color:#7885A7;color:#252C3B;font-size:16px}
    .auth-pilha{display:grid;gap:12px}
    .auth-google{width:22px;height:22px;flex:none}
    .auth-nota{text-align:center;color:#596174;font-size:16px;margin:18px 0 0}
    .auth-erro{padding:14px;border:1px solid #A84643;border-radius:12px;background:#fff;color:#252C3B}
    .auth-email{padding:16px;border-radius:16px;background:#D9DFF0;overflow-wrap:anywhere}
    @media(prefers-color-scheme:dark){.auth-tela{background:#171C28;color:#F6F7FA}.auth-secundario{color:#F6F7FA;border-color:#8994B0}.auth-nota{color:#C3C9D6}.auth-email{background:#2B3347}.auth-erro{background:#252C3B;color:#F6F7FA}}
  `}</style>
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
    <EstilosAuth />
    <div className="auth-rolagem">
      <div className="auth-centro">
        <Marca />
        <h1>Meu Território</h1>
        <p>Registre as casas de cada quadra e acompanhe o território da congregação.</p>
      </div>
      {erro && <div className="auth-erro" role="alert"><strong>Não foi possível entrar</strong><br />Confira a conexão e tente de novo.</div>}
    </div>
    <footer className="auth-rodape">
      <button className="auth-botao" type="button" onClick={entrar} disabled={entrando}>
        {!entrando && <GoogleG />}{entrando ? 'Entrando…' : 'Entrar com Google'}
      </button>
      <p className="auth-nota">Ferramenta feita pela e para a congregação. Não é um app oficial.</p>
    </footer>
  </main>
}
