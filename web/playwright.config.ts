import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // 斷言以中文介面撰寫；網站依瀏覽器語言自動選語言，故固定 zh-TW
  use: { baseURL: 'http://localhost:4173', locale: 'zh-TW' },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    port: 4173,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
