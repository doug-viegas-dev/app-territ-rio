/** Mapa fictício do cartão de demonstração, como imagem SVG embutida. */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 260" font-family="sans-serif" font-size="16">
<rect width="640" height="260" fill="#F5F7FD"/>
<g fill="#E1E6F7" stroke="#5662B5" stroke-width="3">
<rect x="40" y="40" width="250" height="130" rx="10"/><rect x="330" y="40" width="270" height="130" rx="10"/>
</g>
<g fill="#26306B" text-anchor="middle" font-weight="600">
<text x="165" y="112" font-size="28">Quadra A</text><text x="465" y="112" font-size="28">Quadra B</text></g>
<g fill="#5B6396" text-anchor="middle"><text x="165" y="196">Rua das Palmeiras</text><text x="465" y="196">Rua das Acácias</text>
<text x="165" y="224">Rua dos Ipês</text></g>
</svg>`

export const MAPA_DEMO_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
