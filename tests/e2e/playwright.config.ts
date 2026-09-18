import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  webServer:process.env.WALKTHROUGH_SERVER_EXTERNAL === '1' ? undefined : {command:'node tests/e2e/start-server.cjs', url:process.env.WALKTHROUGH_BASE_URL || 'http://localhost:3000', reuseExistingServer:false, timeout:120_000, stdout:'pipe', stderr:'pipe'},
  testDir:'.', testMatch:'*.spec.ts', workers:1, fullyParallel:false, timeout:900_000,
  expect:{timeout:8000}, outputDir:'../../codex-review/walkthrough-D/playwright-results',
  reporter:[['list'],['json',{outputFile:'codex-review/walkthrough-D/playwright-report.json'}]],
  use:{...(process.env.PW_WS_ENDPOINT ? {connectOptions:{wsEndpoint:process.env.PW_WS_ENDPOINT}} : {}),baseURL:process.env.WALKTHROUGH_BASE_URL || 'http://localhost:3000', actionTimeout:8000, navigationTimeout:60000, serviceWorkers:'block'},
  projects:[
    {name:'desktop',use:{viewport:{width:1280,height:800}}},
    {name:'phone',use:{...devices['iPhone 14'],defaultBrowserType:'chromium',viewport:{width:390,height:844}}},
    {name:'app-shell',use:{...devices['iPhone 14'],defaultBrowserType:'chromium',viewport:{width:390,height:844},userAgent:devices['iPhone 14'].userAgent+' ClearCMEApp/1.0.0'}}
  ]
});
