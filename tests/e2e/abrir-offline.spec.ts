import { expect, test, type Page } from '@playwright/test'
import { PUBLICADOR, limparTudo, semear } from './seed'

/** Mesmo fluxo de entrada do offline.spec.ts (popup do emulador de Auth). */
async function entrar(page: Page) {
  await page.goto('/')
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: 'Entrar com Google' }).click(),
  ])
  const novaConta = popup.locator('#add-account-button')
  const email = popup.locator('#email-input')
  await expect(async () => {
    if (!(await email.isVisible()) && (await novaConta.isVisible())) await novaConta.click()
    await expect(email).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: 15_000 })
  await email.fill(PUBLICADOR.email)
  await popup.locator('#display-name-input').fill(PUBLICADOR.nome)
  const fechou = popup.waitForEvent('close')
  await popup.locator('#sign-in').click()
  await fechou
  await expect(page.getByRole('button', { name: /Entrando|Entrar com Google/ })).toBeHidden()
}

test.beforeEach(async () => {
  await limparTudo()
  await semear()
})

test('depois de abrir uma vez online, o app reabre na hora com tudo guardado, mesmo com o Firebase inalcançável', async ({ page, context }) => {
  await entrar(page)
  await expect(page.getByRole('link', { name: /Centro/ })).toBeVisible()
  // Dá tempo ao download em segundo plano (baixarTudo) sem abrir cartão nenhum.
  await page.waitForTimeout(6_000)

  // Rede ruim: o aplicativo carrega, mas nada do Firebase responde (navigator.onLine continua true).
  // E2E_PENDURAR=1: as conexões ficam penduradas (rede "fantasma"), em vez de falhar na hora.
  const penduradas = process.env.E2E_PENDURAR === '1'
  await context.route(/127\.0\.0\.1:(8080|9099|9199)/, (rota) => (penduradas ? new Promise(() => {}) : rota.abort()))
  const inicio = Date.now()
  await page.reload()

  // Sem esqueleto de espera: lista de cartões aparece em poucos segundos.
  await expect(page.getByRole('link', { name: /Centro/ })).toBeVisible({ timeout: 10_000 })
  console.log(`[medida] lista de cartões em ${Date.now() - inicio} ms`)
  await page.getByRole('link', { name: /Centro/ }).click()
  await expect(page.getByRole('link', { name: /Quadra A/ })).toBeVisible({ timeout: 10_000 })
  await page.getByRole('link', { name: /Quadra A/ }).click()
  await expect(page.getByRole('button', { name: /^10/ })).toBeVisible({ timeout: 10_000 })
})
