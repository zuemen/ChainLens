import { chromium } from 'playwright'
const [out, base = 'http://localhost:5173', ...paths] = process.argv.slice(2)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.emulateMedia({ reducedMotion: 'reduce' })
const errs = []; p.on('pageerror', (e) => errs.push(String(e)))
for (const path of paths) {
  await p.goto(base + path); await p.waitForTimeout(path.includes('screening') || path.includes('workbench') ? 5500 : 2500)
  await p.screenshot({ path: `${out}/lk${path.replace(/[/?=]/g, '_')}.png`, fullPage: true })
}
console.log('errors', errs); await b.close()
