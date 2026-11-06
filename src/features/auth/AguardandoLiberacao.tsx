import { sair } from '@/firebase/auth'
import { Marca } from './LoginPage'

export default function AguardandoLiberacao({ email }: { email: string }) {
  return <main className="auth-tela">
    <div className="auth-rolagem">
      <div className="auth-centro">
        <Marca />
        <h1>Aguardando liberação</h1>
        <p>O administrador precisa liberar o seu e-mail antes de você ver os cartões.</p>
      </div>
      <div className="auth-email"><span>Você entrou como</span><strong>{email}</strong></div>
      <p className="auth-nota esquerda">Avise o administrador da congregação. Quando ele liberar, toque em “Verificar de novo”.</p>
    </div>
    <footer className="auth-rodape auth-pilha">
      <button className="auth-botao" type="button" onClick={() => window.location.reload()}>Verificar de novo</button>
      <button className="auth-botao auth-secundario" type="button" onClick={() => void sair()}>Sair</button>
    </footer>
  </main>
}
