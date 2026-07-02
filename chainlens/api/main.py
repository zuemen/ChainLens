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
from pathlib import Path
from typing import Any, Literal

import networkx as nx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, model_validator

from chainlens.data import elliptic, tron
from chainlens.explain.evidence import generate_evidence, run_pipeline

app = FastAPI(
    title="ChainLens API",
    description="SNA + GNN 虛擬資產詐騙金流風險評分（附結構證據）",
    version="0.1.0",
)

RAW_DIR = Path("data/raw")


class ScoreRequest(BaseModel):
    """評分請求：TRON 模式吃 address、Elliptic 模式吃 tx_id。

    mode=auto 時依提供的欄位自動判斷；mode=example 使用內建離線範例圖。
    """

    address: str | None = None
    tx_id: str | None = None
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
        try:
            g = tron.fetch_two_hop_graph(req.address, api_key=os.getenv("TRONGRID_API_KEY"))
        except Exception:
            g = tron.load_example_graph()  # 網路失敗降級為內建範例圖
            return g, g.graph["center"]
        if req.address not in g:
            raise HTTPException(status_code=404, detail=f"地址 {req.address} 查無 USDT 轉帳")
        return g, req.address

    # elliptic 模式
    if not req.tx_id:
        raise HTTPException(status_code=400, detail="elliptic 模式需提供 tx_id")
    if not elliptic.raw_files_exist(RAW_DIR):
        raise HTTPException(
            status_code=404,
            detail="data/raw 缺少 Elliptic 資料集，請先執行 make download-data",
        )
    g = elliptic.load_elliptic_graph(RAW_DIR, include_features=False)
    try:
        tx = int(req.tx_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="tx_id 需為整數") from exc
    if tx not in g:
        raise HTTPException(status_code=404, detail=f"tx_id {tx} 不在資料集中")
    return g, tx


@app.post("/score")
def score(req: ScoreRequest) -> dict[str, Any]:
    """對目標地址/交易評分，回傳 risk_score、label 與結構證據。"""
    g, target = _build_graph(req)
    sna_df, partition, risk_ratios, motif_hits = run_pipeline(g)
    evidence = generate_evidence(target, g, sna_df, partition, risk_ratios, motif_hits)
    return {
        "target": str(target),
        "risk_score": evidence["score"],
        "label": evidence["label"],
        "evidence": [evidence],
    }
