"""ChainLens FastAPI 服務。

POST /score：輸入 TRON 地址或 Elliptic tx_id，回傳風險分數與結構證據。

curl 範例：
    curl -X POST http://localhost:8000/score \
      -H "Content-Type: application/json" \
      -d '{"address": "TXYZ...", "mode": "example"}'

啟動：uvicorn chainlens.api.main:app --port 8000（或 make api）
OpenAPI 文件：http://localhost:8000/docs
"""

from __future__ import annotations

import os
import secrets
from pathlib import Path
from typing import Any, Literal

import httpx
import networkx as nx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, model_validator

from chainlens.data import elliptic, tron
from chainlens.explain.evidence import PipelineResult, generate_evidence, run_pipeline

load_dotenv()  # 讀取 .env（TRONGRID_API_KEY / CHAINLENS_API_KEY）

app = FastAPI(
    title="ChainLens API",
    description="SNA + GNN 虛擬資產詐騙金流風險評分（附結構證據）",
    version="0.1.0",
)

RAW_DIR = Path("data/raw")

# elliptic 模式全圖與管線結果快取（203k 節點載入＋SNA 需數分鐘，絕不可每請求重算）
_elliptic_cache: dict[str, tuple[nx.DiGraph, PipelineResult]] = {}


def _check_api_key(x_api_key: str | None) -> None:
    """設定 CHAINLENS_API_KEY 環境變數時，要求請求帶相同的 X-API-Key 標頭。"""
    expected = os.getenv("CHAINLENS_API_KEY")
    if expected and not (x_api_key and secrets.compare_digest(x_api_key, expected)):
        raise HTTPException(status_code=401, detail="X-API-Key 缺少或不正確")


class ScoreRequest(BaseModel):
    """評分請求：TRON 模式吃 address、Elliptic 模式吃 tx_id。

    mode=auto 時依提供的欄位自動判斷；mode=example 使用內建離線範例圖。
    """

    address: str | None = Field(default=None, max_length=64)
    tx_id: str | None = Field(default=None, max_length=32)
    mode: Literal["auto", "tron", "elliptic", "example"] = "auto"

    @model_validator(mode="after")
    def _require_target(self) -> ScoreRequest:
        if not self.address and not self.tx_id:
            raise ValueError("address 與 tx_id 至少需提供一項")
        return self


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _build_graph(req: ScoreRequest) -> tuple[nx.DiGraph, Any]:
    """依請求模式建圖，回傳（圖, 目標節點）。"""
    mode = req.mode
    if mode == "auto":
        mode = "tron" if req.address else "elliptic"

    if mode == "example":
        g = tron.load_example_graph()
        target = req.address if req.address in g else g.graph["center"]
        return g, target

    if mode == "tron":
        if not req.address:
            raise HTTPException(status_code=400, detail="tron 模式需提供 address")
        if not tron.is_valid_tron_address(req.address):
            raise HTTPException(
                status_code=400, detail="address 需為合法 TRON 主網地址（T 開頭 Base58 34 字元）"
            )
        try:
            g = tron.fetch_two_hop_graph(req.address, api_key=os.getenv("TRONGRID_API_KEY"))
        except httpx.HTTPError as exc:
            # 明確回報上游失敗，絕不可靜默改用內建範例圖誤導呼叫端
            raise HTTPException(
                status_code=502, detail=f"TronGrid 抓取失敗：{exc.__class__.__name__}"
            ) from exc
        if req.address not in g:
            raise HTTPException(status_code=404, detail=f"地址 {req.address} 查無 USDT 轉帳")
        return g, req.address

    # elliptic 模式
    if not req.tx_id:
        raise HTTPException(status_code=400, detail="elliptic 模式需提供 tx_id")
    try:
        tx = int(req.tx_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="tx_id 需為整數") from exc
    if not elliptic.raw_files_exist(RAW_DIR):
        raise HTTPException(
            status_code=404,
            detail="data/raw 缺少 Elliptic 資料集，請先執行 make download-data",
        )
    g, _ = _elliptic_graph_and_pipeline()
    if tx not in g:
        raise HTTPException(status_code=404, detail=f"tx_id {tx} 不在資料集中")
    return g, tx


def _elliptic_graph_and_pipeline() -> tuple[nx.DiGraph, PipelineResult]:
    """載入 Elliptic 全圖並跑分析管線，結果依 RAW_DIR 快取於行程內。"""
    key = str(Path(RAW_DIR).resolve())
    if key not in _elliptic_cache:
        g = elliptic.load_elliptic_graph(RAW_DIR, include_features=False)
        _elliptic_cache[key] = (g, run_pipeline(g))
    return _elliptic_cache[key]


@app.post("/score")
def score(req: ScoreRequest, x_api_key: str | None = Header(default=None)) -> dict[str, Any]:
    """對目標地址/交易評分，回傳 risk_score、label 與結構證據。"""
    _check_api_key(x_api_key)
    g, target = _build_graph(req)
    if req.mode == "elliptic" or (req.mode == "auto" and not req.address):
        _, pipeline = _elliptic_graph_and_pipeline()  # 命中快取，不重算
        sna_df, partition, risk_ratios, motif_hits = pipeline
    else:
        sna_df, partition, risk_ratios, motif_hits = run_pipeline(g)
    evidence = generate_evidence(target, g, sna_df, partition, risk_ratios, motif_hits)
    return {
        "target": str(target),
        "risk_score": evidence["score"],
        "label": evidence["label"],
        "evidence": [evidence],
    }
