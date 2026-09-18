# 2026-09-18 v4：雙引擎（規則＋GraphSAGE）、八個情境、視覺全面改版

決賽 10/5–6；文件截止 9/25 18:00。本文是網站、簡報、影片三者的共同依據。

## 一、為什麼改

9/18 上午檢視 v3 簡報與網站，結論：
- 視覺像公文：海軍藍＋襯線字＋每頁 6～8 個文字方塊，沒有一張圖能三秒看懂。
- GNN 的角色是「試過、輸給 Random Forest、所以不用」——創新性佔 25%，這是自傷。
- Demo 五個情境只對應三種處置，八個痛點裡只有兩個有情境可演。

## 二、後端定案（已實作、126 tests 綠）

### 雙引擎
| | 規則引擎（引擎一） | 結構模型（引擎二） |
|---|---|---|
| 做什麼 | 4 類洗錢圖樣掃描＋上游 4 階資金關聯傳導 → 綜合分數 | GraphSAGE 兩層＋反向訊息傳遞，讀 13 個結構特徵，看上下游 2 階 |
| 輸出 | 自身分數、關聯分數、綜合分數、證據鏈、STR 草稿 | 洗錢基礎設施機率 0～1 ＋ 模型看到的結構事實（白話） |
| 權限 | 決定暫緩／加強審查／放行 | **只能把「放行」升為「加強審查」**（≥0.7 時）；不能單獨暫緩、不能降級 |
| 為何這樣分 | 暫緩出金必須有可稽核證據鏈 | 模型抓「結構像洗錢但沒有規則命中」的變體；人做最後決定 |

模型實作：`chainlens/models/structural.py`（純 numpy 推論，Vercel 可跑）、
`chainlens/models/train_structural.py`（torch 訓練，合成劇本生成器）、
權重 `chainlens/models/weights/structural_sage.json`（49 KB，已 commit）。

13 個特徵：收款來源數、付款對象數、轉入總額、轉出總額、轉出占比、資金停留時間、
有無轉入、有無轉出、活躍時間跨度、一小時內最多來源數、一小時內最多去向數、
轉出金額變異係數、是否已標註實體。全部只靠交易圖就算得出，不需要 Elliptic 的 165 維特徵。

### 訓練資料與誠實邊界
- 訓練於隨機化合成劇本圖（240 張，8:2 切分），held-out F1 0.999。**這個數字只證明模型學會了生成器裡的手法，不可與 Elliptic 數字相比、不可寫成「準確率 99.9%」**。對外只說「在合成資料上訓練，劇本圖八個情境全部落在正確區間，尚未用真實標註資料驗證」。
- 訓練時修過兩個假關聯（都寫進生成器註解）：純來源節點只有被害人 → 加入合法外部入金；合法背景太單調 → 加入當天轉帳、小型經濟圈、自有錢包搬錢。

### 八個情境（`scenario.SCENARIOS`，API `GET /scenarios`）
| # | 目標 | 標題 | 對應痛點 | 金額 | 規則 | 模型 | 最終 |
|---|---|---|---|---|---|---|---|
| 1 | TOtcOut01 | 乾淨的地址，髒的上游 | 黑名單慢一步；金檢要求評估提幣資金流向 | 500,000 | 0.73 暫緩 | 0.99 | 暫緩 |
| 2 | TDownstream01 | 贓款再轉一手 | 固定門檻無法分級 | 500,000 | 0.53 加強審查 | 0.95 | 加強審查 |
| 3 | TMule03 | 車手地址直接出金 | 地址用過即丟 | 500,000 | 1.00 暫緩 | 1.00 | 暫緩 |
| 4 | TVictim01 | 被害人不連坐 | 寧可錯殺傷及被害人 | 500,000 | 0.26 放行 | 0.08 | 放行 |
| 5 | TNormalUser01 | 正常用戶 | 對照組 | 500,000 | 0.10 放行 | 0.10 | 放行 |
| 6 | TSplitOut01 | 拆單規避固定門檻 | 監控門檻是固定金額 | 9,000 | 0.93 暫緩 | 0.99 | 暫緩 |
| 7 | TRelay03 | 快進快出中繼 | 手法一變規則失效 | 200,000 | 0.19 放行 | 0.98 | **加強審查（模型加註）** |
| 8 | TExchUser07 | 交易所熱錢包批次出金的用戶 | 誤報拖垮審查量 | 3,000 | 0.02 放行 | 0.10 | 放行；**若無實體標註 → 1.00 暫緩、30 名用戶全連坐** |

情境 1～5 數字與 v3 完全相同（測試鎖定）。6～8 各掛獨立旗標，不動基準圖百分位。

### API 新增欄位（`POST /screen`）
```
rule_decision: "block"|"review"|"pass"        # 規則引擎單獨的結論
model: null | { score, level: "high"|"medium"|"low", facts_zh: string[], narrative_zh }
model_escalated: boolean                       # true 時 decision 為 review、decision_zh 帶「——由結構模型加註」
counterfactual: null | { label_zh, risk_score, decision, decision_zh, affected_nodes }  # 只有情境 8 非 null
```
`GET /scenarios` → `[{id, target, title_zh, summary_zh, pain_zh, amount_usdt, expect}]`。
STR 草稿第四節多一行「結構模型意見（第二引擎，僅供參考）」。

## 三、視覺定案（網站與簡報共用）

方向：**控制台／證據板**，不是公文。深色底、一個訊號色、大數字、圖譜當主角、一頁一個想法。

### Token
```
--ink:        #0B0D12   頁面底
--surface:    #131722   卡片
--surface-2:  #1B2130   卡片內層／表頭
--line:       #2A3245   分隔線（裝飾）
--line-strong:#4A5670   控制項邊界（≥3:1）
--text:       #E8ECF4
--muted:      #9AA5B8   （於 ink 6.9:1）
--signal:     #FF5C3A   風險、資金路徑、暫緩（文字用於深底 ≥4.5:1）
--model:      #4CC9F0   結構模型通道（第二引擎專用色，不做他用）
--pass:       #3DDC97   放行
--review:     #FFB547   加強審查
--paper:      #F6F1E7   只用於 STR 草稿「紙」；上面文字 #1A1A1A
```
字體：Noto Sans TC（全部，不用襯線）；數字與地址 JetBrains Mono。大數字 800 字重、緊字距。
節點色：被害人 #E2C06A、風險 #FF5C3A、審查目標白色描邊、其他 #6B7A95、已標註實體 #4CC9F0 描邊。

### 網站結構
- 首頁：hero＝一句話＋案件重演（滿版）→ 三個數字 → **八個痛點各對一個情境**（可點，直接跳到該情境）→ 雙引擎圖（SVG）→ 研究一句話＋第 43 期圖 → 現況／規劃 → CTA。文字量減半。
- 出金審查：8 個情境 chip（帶預期處置色）→ 決策卡三欄「規則引擎｜結構模型｜處置（誰決定）」→ 情境 8 顯示反事實橫幅「若沒有實體標註：1.00 暫緩、30 名用戶連坐」→ 圖譜 → 證據鏈 → STR（紙）。
- 模型研究：標題改為「為什麼是兩個引擎，不是一個模型」；第 43 期圖當主視覺；結構模型卡（特徵、訓練、限制）；Elliptic 表保留。
- 工作台：套新 token 即可。

### 簡報（15 頁、6 分鐘主線）
1 封面（圖譜主視覺）｜2 一頁看完｜3 錢的出口（4 段＋3 數字）｜4 八個痛點｜5 實際案例三則｜
6 雙引擎架構圖｜7 結構模型看什麼（13 特徵、反向訊息傳遞、只升不降）｜8 八個情境一張表｜
9 Demo 影片｜10 情境七 vs 八（規則漏模型抓／模型不誤傷）｜11 可解釋輸出｜12 市場與競品｜
13 研究驗證（Elliptic F1＋第 43 期 → 為何不押單一模型）｜14 適法性、資安、現況與規劃｜15 結語

## 四、可引用數字（勿改）
- 招牌：0.33／0.60／0.73 暫緩；情境二 0.53；情境四 0.26；情境五 0.10；情境六 0.93；情境七 規則 0.19→模型 0.98；情境八 規則 0.02、模型 0.10、反事實 1.00／30 名
- Elliptic（203,769 節點）F1：RF 0.806（P 0.907/R 0.725）、SAGE+RMP 0.661、SAGE 0.620、SAGE+SNA 0.601、GCN 0.506；第 43 期起三模型同時失效（Weber 2019）
- 測試：pytest 126、vitest（前端改完後以實際數字為準）
- TRON 實鏈抓取 795 節點；劇本基準圖 53 節點
- 監理：893 億元（2025 詐騙財損，165 儀錶板）、84%（FATF 2026 穩定幣占比）、10 家已登記 VASP（2026/9/3）、金檢 17 家／11 家開罰、Travel Rule 預計 2026 年 10 月
- 結構模型：13 特徵、2 層、hidden 16、reverse message passing（Egressy et al., AAAI 2024）、權重 49 KB、numpy 推論

## 五、不可說的話
- 不說 GNN 已用真實資料驗證、不說準確率 99.9%、不說模型能單獨攔截。
- 不說持久化稽核、跨實例限流、混幣偵測、Neo4j、BTC/ETH 即時擷取已完成。
- 劇本圖是合成資料；尚無商業客戶。
- 情境八的「誤報率」只用我們自己的反事實數字，不引用查不到一手來源的業界數字。

## 六、前端實作紀錄（2026-09-18，web/）

### 做了什麼
- `web/src/index.css` @theme 換成第三節 token；全站 Noto Sans TC（移除 Noto Serif TC），數字與地址 JetBrains Mono，大數字 `.big-num`（800、字距 −0.04em）。
- `web/src/api/types.ts` 加 `rule_decision`、`model`、`model_escalated`、`counterfactual`、`Scenario`。`client.ts` 加 `getScenarios()`。
- 出金審查：8 個 chip（編號＋標題＋預期處置色點），資料來源 `GET /scenarios`，失敗退回 `web/src/content/scenarios.ts` 的內建常數（與後端 SCENARIOS 逐字相同）。`?case=N` 直開情境、`?auto=1` 自動執行、chip 帶入該情境金額。
- 決策卡三欄（`DecisionCard.tsx`）：規則引擎（自身／關聯／綜合＋三級刻度）｜結構模型（機率、等級、facts_zh，--model 色）｜處置（最終決定、誰決定、人做最後決定）。`model_escalated` 時顯示「規則放行 → 模型加註 → 加強審查」；`counterfactual` 非 null 時顯示反事實橫幅。
- 圖譜：情境 1～5 沿用三階段分欄 `ScenarioGraph`；情境 6～8 新做 `FocusGraph`（`focusLayout.ts`）：以目標為中心、上游一階一欄往左、同批收款地址與目標同欄（超過 12 個改兩排交錯）、邊帶箭頭、目標匯入摘要（「11 筆匯入 × 9,000 USDT」）、無關節點收合成一個數字。已標註實體（role `hot_wallet`）用 --model 色描邊。
- STR 草稿改「紙」（--paper 底、#1A1A1A 字）。
- 首頁：一句話＋案件重演 → 三個數字（893 億、84%、11 家）→ 八個痛點各對一個情境（點擊 `/screening?case=N&auto=1`）→ 雙引擎 SVG（`DualEngineDiagram.tsx`）→ 第 43 期圖 → 現況／規劃 → CTA。
- 模型研究：標題改「為什麼是兩個引擎，不是一個模型」，第 43 期圖當主視覺，新增結構模型卡（13 特徵、2 層、hidden 16、RMP、合成資料、八情境全部正確、尚未用真實標註資料驗證），Elliptic 表保留。
- 離線快照 `screening-snapshot.json` 以本機 API `POST /screen {"target":"TOtcOut01","amount_usdt":500000}` 覆寫（含新欄位；因未帶 request_id，STR 案件編號為「（待填）」）。
- 截圖在 `docs/images/v4/`（1280×720 與 390×844，各頁 fold 與全頁）。

### 取捨
- **`--line-strong` 改為 `#6B7A95`**：文件寫 `#4A5670（≥3:1）`，實算於 ink 只有 2.64:1、於 surface 2.43:1，達不到自己宣稱的門檻；改為 #6B7A95（4.48:1／4.13:1）以符合「控制項邊界 ≥3:1」的意圖。其餘 token 照文件；實算：text 16.41:1、muted 7.82:1（文件寫 6.9）、signal 6.33:1（surface 5.83、surface-2 5.24）、model 10.11:1、pass 11.00:1、review 11.06:1、paper-ink 15.46:1，全部 ≥4.5:1。
- 訊號色按鈕上的字用 ink（6.33:1），不用白（3.07:1）。
- 痛點 → 情境對應（不是文件表格的一對多，而是一對一）：1→情境 1、2 金檢未評估資金流向→情境 2、3 固定門檻→情境 6、4 STR 申報量→情境 3、5 穩定幣載體→情境 5、6 AI 黑箱→情境 4、7 手法一變→情境 7、8 誤報→情境 8。痛點 7、8 的來源連結指向本 repo 的 `scenario.py`／`main.py`。
- API 回傳的 graph 節點沒有 `known_entity` 欄位，前端以 role `hot_wallet` 判定「已標註實體」。
- 手機寬度：整頁無橫向捲動（Playwright 實測 scrollWidth = 390）；圖譜在自己的容器內橫向捲動（min-width 760px），否則 1200 寬的 viewBox 縮到 390px 看不清。
- 情境 8 的圖只畫目標 4 階內的子圖（34 個節點），另 48 個無關節點以文字收合，不然 84 節點在同一張圖看不出「熱錢包批次出金」。
- 「研究基礎」與名詞說明收進 `<details>`，文字量減半。

### 未完成
- Playwright e2e（`web/e2e/screening.spec.ts`）未重跑（只跑 vitest），但頁面上 h1「出金審查」、radio 名稱、「下載草稿（.txt）」等其依賴的文字都保留。
- 情境 1～5 的 ScenarioGraph 三階段版面未重排（只套新色）。


## 七、部署與交付紀錄（2026-09-18）

- **坑**：`.vercelignore` 原本整個排除 `chainlens/models/`（當時只有 torch 檔）。結構模型接進 API 後首次部署 `FUNCTION_INVOCATION_FAILED`（`No module named 'chainlens.models'`）。已改為只排除 gcn/sage/train/evaluate/train_structural 五個 torch 檔，保留 `structural.py` 與 `weights/`。
- 上線前驗證法：用只裝 `requirements.txt` 的乾淨 venv（Python 3.11+）匯入 `chainlens.api.main` 並打 `/screen`，能過再 push。
- 影片 v4：1 分鐘版 1:12、完整版 3:02；旁白 edge-tts zh-TW-HsiaoChenNeural；錄影腳本 `record5.mjs` 依賴決策卡標題「兩個引擎，一個處置」等 DOM 文字。
- 簡報 v4：`v4_html/deck.html` → render.cjs → pptx.cjs；第 9 頁封面圖取自影片第 16 秒。
- 測試：pytest 126、vitest 68。
