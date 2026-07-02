# 鏈鏡 ChainLens

**基於社會網路分析之虛擬資產詐騙金流偵測平台**
（2026 台北金融科技獎—校園組 提案 MVP）

ChainLens 以社會網路分析（SNA）＋圖神經網路（GNN）偵測虛擬資產詐騙金流，服務對象為台灣 VASP 業者的法遵篩查。核心賣點是**可解釋性**：每個風險判定都附帶結構證據——中心性異常、社群歸屬、資金路徑圖樣——而非黑箱分數。

## 系統架構

```mermaid
flowchart LR
    subgraph 資料層
        A[Elliptic Data Set<br/>203k 節點 BTC 交易圖] --> C
        B[TronGrid API<br/>TRC-20 USDT 2-hop 圖] --> C
    end
    subgraph 分析層
        C[NetworkX 圖] --> D[SNA 指標<br/>degree / PageRank / k-core / betweenness]
        C --> E[Louvain 社群偵測]
        C --> F[詐騙圖樣規則<br/>fan-in / fan-out / peeling chain]
    end
    subgraph 模型層
        D --> G[GCN / GraphSAGE<br/>PyTorch Geometric]
    end
    subgraph 解釋與服務層
        D & E & F & G --> H[風險證據產生器<br/>結構證據 + 中文調查敘事]
        H --> I[FastAPI POST /score]
        H --> J[Streamlit 工作台<br/>PyVis 互動圖譜]
    end
```

## 快速開始（5 個指令）

```bash
git clone https://github.com/zuemen/ChainLens.git && cd ChainLens
make setup        # uv sync 安裝依賴（需先安裝 uv：pip install uv）
make test         # pytest 全綠（不依賴大資料集）
make api          # FastAPI 於 http://localhost:8000（/docs 看 OpenAPI）
make app          # Streamlit 工作台（離線可用內建範例圖）
```

## Elliptic 資料集下載（訓練用，選配）

模型訓練基準使用 [Elliptic Data Set](https://www.kaggle.com/datasets/ellipticco/elliptic-data-set)（203k 節點比特幣交易圖，licit/illicit 標註）。資料集需自行從 Kaggle 下載：

1. 申請 Kaggle API token（Account → Create New API Token），放到 `~/.kaggle/kaggle.json`
2. 執行：

```bash
make download-data
# 等同：uv run --with kaggle kaggle datasets download -d ellipticco/elliptic-data-set -p data/raw --unzip
```

3. 確認 `data/raw/` 有三個 CSV：`elliptic_txs_features.csv`、`elliptic_txs_classes.csv`、`elliptic_txs_edgelist.csv`
4. 訓練：`make train`（或 `uv run python -m chainlens.models.train --model sage --use-sna`）

若 `data/raw/` 沒有資料集，`make train` 會自動改用合成小圖冒煙驗證管線（指標不具意義）。

## 模型指標（illicit 類別）

遵守 Elliptic 官方時間切分（train ≤ 34 期 / test ≥ 35 期）避免資料洩漏。

| 模型 | 特徵 | Precision | Recall | F1 | PR-AUC |
|---|---|---|---|---|---|
| GCN | 原始 165 維 | 待資料下載後執行 `make train` 產生 | | | |
| GraphSAGE | 原始 165 維 | 待資料下載後執行 `make train` 產生 | | | |
| GraphSAGE | 原始 + SNA 特徵（消融） | 待資料下載後執行 `make train --use-sna` 產生 | | | |

## API 範例

```bash
# 離線範例圖（無需網路 / API key）
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{"address": "TScamCollector001", "mode": "example"}'

# TRON 即時 2-hop 圖（建議設定 TRONGRID_API_KEY，見 .env.example）
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{"address": "T你的地址", "mode": "tron"}'
```

回應格式：`{target, risk_score, label, evidence[]}`，`evidence` 含 `top_features`、`centrality_percentile`、`community_risk_ratio`、`motif_hits[]` 與中文調查敘事 `narrative_zh`。

## 詐騙圖樣規則

| 圖樣 | 定義 |
|---|---|
| 集資扇入 fan-in | 短時間窗內 ≥N 個來源匯入同一節點 |
| 快速分散 fan-out | 單節點快速拆分至 ≥N 個新地址 |
| 剝洋蔥鏈 peeling chain | 連續 ≥K 跳、每跳保留大額轉出＋小額剝離 |

## 專案結構

```
chainlens/
├── data/        # elliptic.py（CSV→PyG/NetworkX）、tron.py（TronGrid 2-hop 抓取）
├── sna/         # metrics.py、community.py（Louvain）、motifs.py（圖樣規則）
├── models/      # gcn.py、sage.py、train.py（時間切分訓練 + SNA 消融）
├── explain/     # evidence.py（結構證據 + 中文敘事）
├── api/         # main.py（FastAPI /score）
└── app/         # workbench.py（Streamlit + PyVis）
```

## 開發

- 套件管理：[uv](https://docs.astral.sh/uv/)；lint：`make lint`（ruff）；測試：`make test`（pytest，全部使用小型合成圖 fixture）
- 環境變數範本見 `.env.example`；secrets 絕不入版控
- CI：GitHub Actions（ruff + pytest）

## 免責聲明

本專案為學術研究與競賽展示用途，風險分數與調查敘事僅供參考，**不構成投資建議、法律意見或合規判定**。實際法遵決策請諮詢專業人士並遵循主管機關規範。

## License

MIT © ChainLens Team
