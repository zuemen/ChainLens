# 決策：Demo 網站與 API 同源部署，並統一視覺識別

日期：2026-09-17

## 問題
線上網址 `chain-lens-beta.vercel.app` 打開是 Swagger 文件，評審點進來看不到產品。
`web/` 前端早已完成，但設計成「獨立 Vercel 專案」，一直沒有人建立那個專案。

## 決定
1. **同源部署**：`web/` 以 `npm run build:site` 建置到 repo 根目錄 `public/` 並入版控；
   FastAPI 於 `/` 回 `index.html`、catch-all GET 提供靜態資產與前端路由（`SPA_ROUTES`）。
   - 選 `public/` 是因為 Vercel 會把它當靜態檔走 CDN；若函式內沒有這個目錄，
     前端路由改為導回 `/`，兩種情況都不會 404。
   - catch-all 註冊在所有 API 路由之後，並在 `resolve()` 後檢查仍位於 `public/` 內，擋路徑穿越。
   - 沒有 `public/index.html` 時行為與舊版相同（`/` 導向 `/docs`），純 API 部署不受影響。
2. **視覺識別與決賽簡報一致**：紙色底、墨黑襯線標題（Noto Serif TC）、證據橘只用於資金路徑與關鍵數字；
   圖譜畫布維持深色（節點色在深底才分得開，`graph/elements.ts` 的 hex 不動）。
   色票對比值實算後寫在 `web/src/index.css` 註解。
3. 首頁重寫：主視覺資金流動畫、招牌情境算式（0.33 ⊕ 0.60 = 0.73）與門檻刻度、四步驟、
   與黑名單／Travel Rule 的對照、驗證數字、「已實作／發展藍圖」對照表。

## 取捨
- 建置產物入版控不優雅，但不需要 Vercel CLI 或第二個專案，push 即上線。代價是改前端後必須重跑 `build:site`。
- 首頁經由 Python 函式提供時會吃到 serverless 冷啟動（實測約 5 秒）；若 Vercel 以 CDN 提供 `public/` 則無此問題。
  部署後需實測確認走的是哪一條路。
- 獨立 Vercel 專案的部署方式（`web/vercel.json`）保留為備選。

## 驗證
本機以 uvicorn 同源提供：`/`、`/screening` 重新整理、靜態資產、`/docs`、`/health` 皆 200，未知路徑 404；
瀏覽器實跑出金審查得到即時結果 0.73（非離線快照），console 無錯誤。pytest 98、vitest 34、ruff、tsc 全過。
