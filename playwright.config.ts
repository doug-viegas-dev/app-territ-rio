import { defineConfig, devices } from '@playwright/test'

const PORTA = 5174

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORTA}`,
    trace: 'retain-on-failure',
    locale: 'pt-BR',
    ...devices['Pixel 7'],
    // E2E_CANAL=chrome usa o Chrome instalado, sem baixar o Chromium do Playwright.
    ...(process.env.E2E_CANAL ? { channel: process.env.E2E_CANAL } : {}),
  },
  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${PORTA} --strictPort`,
    url: `http://127.0.0.1:${PORTA}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      VITE_USE_EMULATORS: 'true',
      // Padrões do firebase.json; E2E_*_PORT troca quando elas já estão em uso.
      VITE_FIRESTORE_EMULATOR_PORT: process.env.E2E_FIRESTORE_PORT ?? '8080',
      VITE_AUTH_EMULATOR_PORT: process.env.E2E_AUTH_PORT ?? '9099',
      VITE_STORAGE_EMULATOR_PORT: process.env.E2E_STORAGE_PORT ?? '9199',
      VITE_FIREBASE_API_KEY: 'demo-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'demo-meu-territorio.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'demo-meu-territorio',
      VITE_FIREBASE_STORAGE_BUCKET: 'demo-meu-territorio.appspot.com',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
      VITE_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000',
    },
  },
})
