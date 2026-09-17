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

## 部署後實測（2026-09-17）
- `/` 與靜態資產由 Vercel CDN 提供（`x-vercel-cache: HIT`，約 0.36 秒），**沒有冷啟動問題**。
- Python 函式內確實沒有 `public/`：前端路由原本被 FastAPI 導回 `/`。
  因此在 `vercel.json` 加 rewrite，把 `/screening`、`/workbench`、`/research` 直接指到 `/index.html`，
  深連結與重新整理都留在原頁。FastAPI 的 catch-all 仍保留，供本機與 Docker／Render 部署使用。

## 首頁改為「案件重演」（2026-09-17 晚）
評審打開網址要在 30 秒內看懂產品。原本的 Demo 是「表單＋一長串結果」，要自己讀才懂。

- 首頁第一屏＝一句話定位＋**案件重演**（`web/src/components/CaseReplay.tsx`）：六幕自動播放約 27 秒——
  名單比對放行 → 往上游追 1 階 → 第 2 階集資主錢包 → 整張洗錢網路（集資／分層／整合）→ 風險傳導 0.33 ⊕ 0.60 = 0.73 → 暫緩出金。
  旁白放在舞台上方，定位＋旁白＋舞台在 1440×900 一屏內。可暫停、逐幕前後、點圓點跳幕；`prefers-reduced-motion` 時不自動播放。
- 資料來源是與 API 回傳同一份的劇本快照（`screening-snapshot.json`），畫面明示「案件重演・合成劇本資料」，
  不偽裝成即時查詢；「親手執行一次即時審查」連到 `/screening?auto=1`，進頁自動送出真正的 API 查詢。
- 版面由 `web/src/graph/replayLayout.ts` 依角色分欄、依上游平均高度排序；跨多欄的長邊走弧線從節點列之間穿過，
  避免風險路徑看起來「經過」無關節點。有單元測試（階數與 API 的關聯階數一致、節點不重疊、都在舞台內）。
- 審查頁結果順序改為 決策 → 圖譜 → 證據鏈（預設 4 條，可展開全部）→ STR 草稿 → 原始 JSON（收合）。
- 工作台：公開站未設定 `CHAINLENS_API_KEY`，即時鏈上查詢依設計停用（503）；前端改顯示訪客看得懂的說明。
