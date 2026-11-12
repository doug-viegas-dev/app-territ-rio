// Conjunto de ícones do protótipo (design/prototipo/js/app.js), como sprite SVG montado uma vez no app.
const forma = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"'
const F = 'style="fill:var(--ic-forma,currentColor)"'
const G = 'style="fill:none;stroke:var(--ic-glifo,var(--glifo));stroke-width:2;stroke-linecap:round;stroke-linejoin:round"'
const nuvem = 'M7 18h10a4 4 0 0 0 .7-7.9A6 6 0 0 0 6.2 9.6 4.5 4.5 0 0 0 7 18z'

const simbolos =
  // status
  `<symbol id="i-falado" viewBox="0 0 24 24"><circle ${F} cx="12" cy="12" r="11"/><path ${G} d="M6.8 12.4l3.8 3.8 6.8-7.6"/></symbol>` +
  `<symbol id="i-sem-resposta" viewBox="0 0 24 24"><rect ${F} x="1.5" y="1.5" width="21" height="21" rx="4.5"/><path ${G} d="M8 8l8 8M16 8l-8 8"/></symbol>` +
  `<symbol id="i-estudo" viewBox="0 0 24 24"><path ${F} stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M12 1.2L22.8 12 12 22.8 1.2 12z"/><path ${G} d="M12 9.2v6.4M12 9.2c-1.3-1-3-1.3-4.6-1v6.2c1.6-.3 3.3 0 4.6 1M12 9.2c1.3-1 3-1.3 4.6-1v6.2c-1.6-.3-3.3 0-4.6 1"/></symbol>` +
  `<symbol id="i-nao-visitar" viewBox="0 0 24 24"><path ${F} stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" d="M8 1.5h8L22.5 8v8L16 22.5H8L1.5 16V8z"/><path ${G} d="M7.5 12h9"/></symbol>` +
  `<symbol id="i-nao-em-casa" viewBox="0 0 24 24"><path ${F} stroke="currentColor" stroke-width="3" stroke-linejoin="round" d="M12 2.8L21.4 11v9.2H2.6V11z"/><path ${G} d="M9.8 20.2v-5.2h4.4v5.2"/></symbol>` +
  `<symbol id="i-carta" viewBox="0 0 24 24"><path ${F} stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M12 1.5l9 5.2v10.6l-9 5.2-9-5.2V6.7z"/><rect ${G} x="7" y="8.6" width="10" height="7" rx="1.4"/><path ${G} d="M7.4 9.4L12 13l4.6-3.6"/></symbol>` +
  `<symbol id="i-pendente" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3"/></symbol>` +
  // interface
  `<symbol id="i-voltar" viewBox="0 0 24 24"><path ${forma} d="M15 5l-7 7 7 7"/></symbol>` +
  `<symbol id="i-chev" viewBox="0 0 24 24"><path ${forma} d="M9 5l7 7-7 7"/></symbol>` +
  `<symbol id="i-mais" viewBox="0 0 24 24"><path ${forma} stroke-width="2.6" d="M12 5v14M5 12h14"/></symbol>` +
  `<symbol id="i-casa-mais" viewBox="0 0 24 24"><path ${forma} d="M3 11.5L11 4l8 7.5M5.5 10v9.5h5M16.5 13.5v7M13 17h7"/></symbol>` +
  `<symbol id="i-fechar" viewBox="0 0 24 24"><path ${forma} d="M6 6l12 12M18 6L6 18"/></symbol>` +
  `<symbol id="i-check" viewBox="0 0 24 24"><path ${forma} stroke-width="2.6" d="M5 12.5l4.5 4.5L19 7.5"/></symbol>` +
  `<symbol id="i-ordem" viewBox="0 0 24 24"><path ${forma} d="M8 4v16M8 4L4.5 7.5M8 4l3.5 3.5M16 20V4m0 16l-3.5-3.5M16 20l3.5-3.5"/></symbol>` +
  `<symbol id="i-subir" viewBox="0 0 24 24"><path ${forma} stroke-width="2.6" d="M6 15l6-6 6 6"/></symbol>` +
  `<symbol id="i-descer" viewBox="0 0 24 24"><path ${forma} stroke-width="2.6" d="M6 9l6 6 6-6"/></symbol>` +
  `<symbol id="i-alca" viewBox="0 0 24 24"><g fill="currentColor"><circle cx="9" cy="6" r="1.8"/><circle cx="15" cy="6" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="9" cy="18" r="1.8"/><circle cx="15" cy="18" r="1.8"/></g></symbol>` +
  `<symbol id="i-pontos" viewBox="0 0 24 24"><g fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></g></symbol>` +
  `<symbol id="i-editar" viewBox="0 0 24 24"><path ${forma} d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19zM14.5 6.5l3 3"/></symbol>` +
  `<symbol id="i-mover" viewBox="0 0 24 24"><path ${forma} d="M5 12h14M13 6l6 6-6 6"/></symbol>` +
  `<symbol id="i-sair" viewBox="0 0 24 24"><path ${forma} d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9"/></symbol>` +
  `<symbol id="i-email" viewBox="0 0 24 24"><rect ${forma} x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path ${forma} d="M4 8l8 6 8-6"/></symbol>` +
  `<symbol id="i-pin" viewBox="0 0 24 24"><path ${forma} d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle ${forma} cx="12" cy="10" r="2.4"/></symbol>` +
  `<symbol id="i-ampliar" viewBox="0 0 24 24"><path ${forma} d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></symbol>` +
  `<symbol id="i-cadeado" viewBox="0 0 24 24"><rect ${forma} x="5" y="11" width="14" height="9" rx="2.5"/><path ${forma} d="M8 11V8a4 4 0 0 1 8 0v3"/></symbol>` +
  `<symbol id="i-upload" viewBox="0 0 24 24"><path ${forma} d="M12 16V4M7 9l5-5 5 5M5 20h14"/></symbol>` +
  `<symbol id="i-arquivo" viewBox="0 0 24 24"><path ${forma} d="M7 3h7l5 5v13H7zM14 3v5h5"/></symbol>` +
  `<symbol id="i-compartilhar" viewBox="0 0 24 24"><path ${forma} d="M12 15V3M8 7l4-4 4 4M7 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></symbol>` +
  `<symbol id="i-tela-inicio" viewBox="0 0 24 24"><rect ${forma} x="4" y="4" width="16" height="16" rx="3.5"/><path ${forma} d="M12 8.5v7M8.5 12h7"/></symbol>` +
  `<symbol id="i-cartoes" viewBox="0 0 24 24"><rect ${forma} x="4" y="4" width="7" height="7" rx="2"/><rect ${forma} x="13" y="4" width="7" height="7" rx="2"/><rect ${forma} x="4" y="13" width="7" height="7" rx="2"/><rect ${forma} x="13" y="13" width="7" height="7" rx="2"/></symbol>` +
  `<symbol id="i-admin" viewBox="0 0 24 24"><path ${forma} d="M4 7h9M19 7h1M4 17h2M11 17h9"/><circle ${forma} cx="16" cy="7" r="2.4"/><circle ${forma} cx="8.5" cy="17" r="2.4"/></symbol>` +
  `<symbol id="i-aviso" viewBox="0 0 24 24"><path ${forma} d="M12 3.5l9.5 16.5h-19zM12 10v4.5M12 17.4v.1"/></symbol>` +
  `<symbol id="i-info" viewBox="0 0 24 24"><circle ${forma} cx="12" cy="12" r="9.5"/><path ${forma} d="M12 11v5.5M12 7.7v.1"/></symbol>` +
  // conexão
  `<symbol id="i-offline" viewBox="0 0 24 24"><path ${forma} d="${nuvem}"/><path ${forma} d="M4 4l16 16"/></symbol>` +
  `<symbol id="i-nuvem-ok" viewBox="0 0 24 24"><path ${forma} d="${nuvem}"/><path ${forma} d="M9.5 13.2l2 2 3.5-4"/></symbol>` +
  `<symbol id="i-nuvem" viewBox="0 0 24 24"><path ${forma} d="${nuvem}"/></symbol>` +
  `<symbol id="i-sincronizando" viewBox="0 0 24 24"><path ${forma} d="M20 11a8 8 0 0 0-14.5-4M4 5v4h4M4 13a8 8 0 0 0 14.5 4M20 19v-4h-4"/></symbol>` +
  `<symbol id="i-cadeado-aberto" viewBox="0 0 24 24"><rect ${forma} x="5" y="11" width="14" height="9" rx="2.5"/><path ${forma} d="M8 11V8a4 4 0 0 1 7.6-1.7"/></symbol>` +
  `<symbol id="i-rodada" viewBox="0 0 24 24"><path ${forma} d="M5 21V4M5 5h12l-2.5 4 2.5 4H5"/></symbol>` +
  `<symbol id="i-historico" viewBox="0 0 24 24"><path ${forma} d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4M12 8v4.5l3 1.8"/></symbol>`

export function Sprite() {
  return <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
    <defs dangerouslySetInnerHTML={{ __html: simbolos }} />
  </svg>
}

export function Icone({ nome, className = 'ic' }: { nome: string; className?: string }) {
  return <svg className={className} aria-hidden="true"><use href={`#i-${nome}`} /></svg>
}
