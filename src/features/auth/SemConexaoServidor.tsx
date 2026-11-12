import { sair } from '@/firebase/auth'
import { verificarDeNovo } from '@/firebase/members'
import { Marca } from './LoginPage'

export default function SemConexaoServidor({ email }: { email: string }) {
  return <main className="auth-tela">
    <div className="auth-rolagem">
      <div className="auth-centro">
        <Marca />
        <h1>Sem conexão com o servidor</h1>
        <p>Não foi possível conferir a sua liberação agora. Isso não quer dizer que o seu e-mail não esteja liberado.</p>
      </div>
      <div className="auth-email"><span>Você entrou como</span><strong>{email}</strong></div>
      <p className="auth-nota esquerda">Confira a sua internet e toque em “Tentar de novo”.</p>
    </div>
    <footer className="auth-rodape auth-pilha">
      <button className="auth-botao" type="button" onClick={() => void verificarDeNovo()}>Tentar de novo</button>
      <button className="auth-botao auth-secundario" type="button" onClick={() => void sair()}>Sair</button>
    </footer>
  </main>
}
