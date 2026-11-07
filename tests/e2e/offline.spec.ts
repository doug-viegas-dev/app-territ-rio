import { expect, test, type Page } from '@playwright/test'
import {
  ADMIN,
  CARTAO_ABERTO,
  CARTAO_FECHADO,
  CARTAO_QUASE,
  DESCONHECIDO,
  PUBLICADOR,
  lerColecao,
  lerDoc,
  limparTudo,
  semear,
} from './seed'

type Pessoa = { email: string; nome: string }

/** Entra pelo popup do emulador de Auth (o app só tem "Entrar com Google"). */
async function entrar(page: Page, pessoa: Pessoa) {
  page.on('pageerror', (e) => console.log(`[erro na página] ${e.message}`))
  await page.goto('/')
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: 'Entrar com Google' }).click(),
  ])
  const novaConta = popup.locator('#add-account-button')
  const email = popup.locator('#email-input')
  // Sem contas, o widget já abre o formulário; com contas, mostra a lista com "adicionar".
  // A tela troca de uma para outra enquanto carrega, então tenta de novo até o formulário aparecer.
  await expect(async () => {
    if (!(await email.isVisible()) && (await novaConta.isVisible())) await novaConta.click()
    await expect(email).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: 15_000 })
  await email.fill(pessoa.email)
  await popup.locator('#display-name-input').fill(pessoa.nome)
  const fechou = popup.waitForEvent('close')
  await popup.locator('#sign-in').click()
  await fechou
  await expect(page.getByRole('button', { name: /Entrando|Entrar com Google/ })).toBeHidden()
}

const caminhoCasas = (cartao: string, quadra = 'q1') => `cards/${cartao}/blocks/${quadra}/houses`

test.beforeEach(async () => {
  await limparTudo()
  await semear()
})

test('(a) publicador registra visita e cadastra casa offline; ao voltar, tudo chega ao Firestore', async ({ page, context }) => {
  await entrar(page, PUBLICADOR)
  await page.getByRole('link', { name: /Centro/ }).click()
  await page.getByRole('link', { name: /Quadra A/ }).click()
  await expect(page.getByRole('button', { name: /^10/ })).toBeVisible()

  await context.setOffline(true)
  await expect(page.getByText('Sem internet').first()).toBeVisible()

  await page.getByRole('button', { name: 'Conversado' }).click()
  await expect(page.getByText('0 de 3 resolvidas')).toBeHidden()
  await expect(page.getByText('1 de 3 resolvidas')).toBeVisible()

  await page.getByRole('button', { name: 'Adicionar casa' }).click()
  await page.getByLabel('Descrição curta').fill('portão azul')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await page.getByRole('tab', { name: 'Todas' }).click()
  await expect(page.getByText('portão azul')).toBeVisible()
  await expect(page.getByText('1 de 4 resolvidas')).toBeVisible()

  await context.setOffline(false)

  await expect.poll(async () => (await lerDoc(`cards/${CARTAO_ABERTO}`))?.totalCasas, { timeout: 30_000 }).toBe(4)
  const cartao = await lerDoc(`cards/${CARTAO_ABERTO}`)
  expect(cartao?.resolvidas).toBe(1)
  expect(cartao?.estado).toBe('aberto')

  const visitas = await lerColecao(`${caminhoCasas(CARTAO_ABERTO)}/h10/visits`)
  expect(visitas).toHaveLength(1)
  expect(visitas[0]).toMatchObject({ status: 'falado', porNome: PUBLICADOR.nome, ciclo: 1 })
  expect((await lerDoc(`${caminhoCasas(CARTAO_ABERTO)}/h10`))?.status).toBe('falado')

  const casas = await lerColecao(caminhoCasas(CARTAO_ABERTO))
  const nova = casas.find((c) => c.descricao === 'portão azul')
  expect(nova).toBeDefined()
  expect(nova?.numero).toBeUndefined()
  expect(nova?.status).toBe('pendente')
})

test('(b) registrar a última casa pendente fecha o cartão e ele vai para Fechados', async ({ page }) => {
  await entrar(page, PUBLICADOR)
  await page.getByRole('link', { name: /Jardim/ }).click()
  await page.getByRole('link', { name: /Quadra B/ }).click()
  await page.getByRole('button', { name: 'Conversado' }).click()

  await expect.poll(async () => (await lerDoc(`cards/${CARTAO_QUASE}`))?.estado).toBe('fechado')
  const cartao = await lerDoc(`cards/${CARTAO_QUASE}`)
  expect(cartao).toMatchObject({ resolvidas: 2, totalCasas: 2, ciclo: 2 })
  const eventos = await lerColecao(`cards/${CARTAO_QUASE}/eventos`)
  expect(eventos).toHaveLength(1)
  expect(eventos[0]).toMatchObject({ tipo: 'fechado', motivo: 'fechamento_automatico', porNome: PUBLICADOR.nome })

  await page.goto('/')
  const fechados = page.getByRole('heading', { name: /Fechados/ })
  await expect(fechados).toBeVisible()
  await expect(page.getByRole('link', { name: /Jardim/ })).toContainText('Fechado')
})

test('(c) admin reinicia o território: casas voltam a pendente, menos "Não visitar"', async ({ page }) => {
  await entrar(page, ADMIN)
  await page.getByRole('link', { name: 'Administração' }).click()
  await page.getByRole('tab', { name: 'Ciclo' }).click()
  await page.getByRole('radiogroup', { name: 'Cartão do ciclo' }).getByRole('radio', { name: 'Cartão 3' }).click()
  await page.getByRole('button', { name: 'Reiniciar território' }).first().click()
  await page.getByRole('checkbox', { name: /novo ciclo/ }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Reiniciar território' }).click()

  await expect.poll(async () => (await lerDoc(`cards/${CARTAO_FECHADO}`))?.estado).toBe('aberto')
  const casas = Object.fromEntries((await lerColecao(caminhoCasas(CARTAO_FECHADO))).map((c) => [c._id, c.status]))
  expect(casas).toEqual({ h1: 'pendente', h2: 'pendente', h3: 'nao_visitar', h4: 'pendente' })
  expect(await lerDoc(`cards/${CARTAO_FECHADO}`)).toMatchObject({ resolvidas: 1, totalCasas: 4, ciclo: 2, abertoPorNome: ADMIN.nome })
  const eventos = await lerColecao(`cards/${CARTAO_FECHADO}/eventos`)
  expect(eventos.map((e) => e.motivo)).toEqual(['reinicio'])
})

test('(d) quem não está em members vê "Aguardando liberação" e não lê dados', async ({ page }) => {
  await entrar(page, DESCONHECIDO)
  await expect(page.getByRole('heading', { name: 'Aguardando liberação' })).toBeVisible()
  await expect(page.getByText(DESCONHECIDO.email)).toBeVisible()
  await expect(page.getByText('Centro')).toBeHidden()
})

test('(e) cartão fechado trava o publicador; admin abre e o histórico registra quem abriu', async ({ browser }) => {
  const publicador = await browser.newPage()
  await entrar(publicador, PUBLICADOR)
  await publicador.getByRole('link', { name: /Vila/ }).click()
  await expect(publicador.getByText(/Peça a um deles/)).toBeVisible()
  await expect(publicador.getByRole('button', { name: 'Abrir cartão' })).toHaveCount(0)
  await publicador.getByRole('link', { name: /Quadra C/ }).click()
  await expect(publicador.getByText(/Só um administrador pode abrir o cartão/)).toBeVisible()
  const botoes = publicador.getByRole('region', { name: 'Registrar visita' }).getByRole('button')
  await expect(botoes).toHaveCount(4)
  for (const b of await botoes.all()) await expect(b).toHaveAttribute('aria-disabled', 'true')
  await expect(publicador.getByRole('button', { name: 'Adicionar casa' })).toHaveCount(0)
  await publicador.close()

  const admin = await browser.newPage()
  await entrar(admin, ADMIN)
  await admin.getByRole('link', { name: /Vila/ }).click()
  await admin.getByRole('button', { name: 'Abrir cartão' }).click()
  await admin.getByRole('dialog', { name: 'Abrir cartão' }).getByRole('button', { name: 'Abrir cartão' }).click()
  await expect(admin.getByText(`Aberto por ${ADMIN.nome}`)).toBeVisible()

  await admin.goto(`/admin/cartao/${CARTAO_FECHADO}/historico`)
  const lista = admin.getByRole('list', { name: 'Eventos do cartão' })
  await expect(lista.getByText('Aberto', { exact: true })).toBeVisible()
  await expect(lista.getByText(`${ADMIN.nome} abriu o cartão`)).toBeVisible()
  await admin.close()
})

test('(f) publicador cria uma rua nova pelo chip "Nova rua" e cadastra uma casa nela', async ({ page }) => {
  await entrar(page, PUBLICADOR)
  await page.getByRole('link', { name: /Centro/ }).click()
  await page.getByRole('link', { name: /Quadra A/ }).click()
  await page.getByRole('button', { name: 'Adicionar casa' }).click()
  await page.getByRole('button', { name: 'Nova rua' }).click()
  await page.getByLabel('Nome da rua').fill('Rua das Palmeiras')
  await page.getByRole('button', { name: 'Adicionar rua' }).click()
  await expect(page.getByRole('radio', { name: 'Rua das Palmeiras' })).toBeChecked()
  await page.getByLabel(/Número/).fill('77')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()

  await expect.poll(async () => (await lerDoc(`cards/${CARTAO_ABERTO}/blocks/q1`))?.ruas).toContain('Rua das Palmeiras')
  await expect.poll(async () => (await lerColecao(caminhoCasas(CARTAO_ABERTO))).some((c) => c.rua === 'Rua das Palmeiras' && c.numero === '77')).toBe(true)
  expect((await lerDoc(`cards/${CARTAO_ABERTO}/blocks/q1`))?.ruas).toEqual(['Rua das Flores', 'Rua do Sol', 'Rua das Palmeiras'])
})
