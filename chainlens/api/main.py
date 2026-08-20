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
import threading
import time
from collections import defaultdict, deque
from pathlib import Path
from typing import Any, Literal

import httpx
import networkx as nx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, Response
from pydantic import BaseModel, Field, model_validator

from chainlens.api.serialize import graph_to_json, sna_table
from chainlens.data import elliptic, scenario, tron
from chainlens.explain.evidence import PipelineResult, generate_evidence, run_pipeline
from chainlens.explain.screening import screen_withdrawal

load_dotenv()  # 讀取 .env（TRONGRID_API_KEY / CHAINLENS_API_KEY）

app = FastAPI(
    title="ChainLens API",
    description="SNA + GNN 虛擬資產詐騙金流風險評分（附結構證據）",
    version="0.1.0",
)


def _cors_origins() -> list[str]:
    """允許來源清單；未設定環境變數時全開（本 API 為公開唯讀 demo）。"""
    raw = os.getenv("CHAINLENS_CORS_ORIGINS", "*")
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins or ["*"]


# allow_credentials 必須為 False：瀏覽器規範不允許它與 allow_origins=["*"] 併用，
# 且本 API 不使用 cookie，僅選配的 X-API-Key 標頭。
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key"],
)

RAW_DIR = Path("data/raw")

# elliptic 模式全圖與管線結果快取（203k 節點載入＋SNA 需數分鐘，絕不可每請求重算）
_elliptic_cache: dict[str, tuple[nx.DiGraph, PipelineResult]] = {}


def _check_api_key(x_api_key: str | None, *, required: bool = False) -> None:
    """驗證 X-API-Key。

    - 設定 CHAINLENS_API_KEY 時，一律要求請求帶相同的 X-API-Key 標頭。
    - required=True（會動用伺服器端第三方額度或重運算的路徑）時，就算沒設
      CHAINLENS_API_KEY 也直接拒絕：fail-closed，避免忘記設定就等於開放。
    """
    expected = os.getenv("CHAINLENS_API_KEY")
    if not expected:
        if required:
            raise HTTPException(
                status_code=503,
                detail="此端點需要 CHAINLENS_API_KEY，伺服器未設定故停用",
            )
        return
    if not (x_api_key and secrets.compare_digest(x_api_key, expected)):
        raise HTTPException(status_code=401, detail="X-API-Key 缺少或不正確")


# ── 每 IP 速率限制 ────────────────────────────────────────────────────────────
# /screen、/graph、/score 每次請求都要跑一輪 SNA 管線（tron 模式還會呼叫
# TronGrid 消耗伺服器端的第三方 API 額度），公開端點若不限流很容易被拿來
# 打成阻斷服務或盜刷額度。這裡用行程內的滑動視窗，不額外引入依賴。
_RATE_LIMIT = int(os.getenv("CHAINLENS_RATE_LIMIT", "30"))  # 每視窗允許次數
_RATE_WINDOW = int(os.getenv("CHAINLENS_RATE_WINDOW_SECONDS", "60"))
_rate_hits: dict[str, deque[float]] = defaultdict(deque)
_rate_lock = threading.Lock()


def _client_key(request: Request) -> str:
    """取用戶端識別。反向代理後方以 X-Forwarded-For 的第一段為準。"""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_limit(request: Request) -> None:
    if _RATE_LIMIT <= 0:  # 設為 0 或負數即停用（本機測試用）
        return
    key = _client_key(request)
    now = time.monotonic()
    with _rate_lock:
        hits = _rate_hits[key]
        while hits and now - hits[0] > _RATE_WINDOW:
            hits.popleft()
        if len(hits) >= _RATE_LIMIT:
            raise HTTPException(
                status_code=429,
                detail=f"請求過於頻繁，請於 {_RATE_WINDOW} 秒後再試",
            )
        hits.append(now)


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


class ScreenRequest(BaseModel):
    """出金審查請求：目標地址限定為劇本情境中的兩個地址。"""

    target: str = Field(max_length=64)
    amount_usdt: float = Field(gt=0)
    request_id: str | None = Field(default=None, max_length=64)


class GraphRequest(BaseModel):
    """工作台圖譜請求：內建範例圖，或 TronGrid 即時抓取的 2-hop 真實圖。"""

    mode: Literal["example", "tron"] = "example"
    address: str | None = Field(default=None, max_length=64)


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    """本服務為純 API，無前端頁面；根路徑導向互動式文件供瀏覽器訪客試打。"""
    return RedirectResponse("/docs")


@app.get("/favicon.ico", include_in_schema=False)
@app.get("/favicon.png", include_in_schema=False)
def favicon() -> Response:
    """瀏覽器會自動索取 favicon（.ico 與 .png 皆會試），回 204 避免 log 充斥無意義的 404。"""
    return Response(status_code=204)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _evidences_for(
    g: nx.DiGraph,
    sna_df: Any,
    partition: dict[Any, int],
    risk_ratios: dict[int, float],
    motif_hits: list[Any],
) -> dict[Any, dict[str, Any]]:
    """全節點證據，供圖譜著色與節點面板使用。"""
    return {
        node: generate_evidence(node, g, sna_df, partition, risk_ratios, motif_hits)
        for node in g.nodes()
    }


@app.post("/screen")
def screen(
    req: ScreenRequest,
    request: Request,
    x_api_key: str | None = Header(default=None),
) -> dict[str, Any]:
    """出金審查：回傳決策、關聯證據鏈、金流圖譜與 STR 草稿。"""
    _check_api_key(x_api_key)
    _rate_limit(request)
    allowed = {scenario.WITHDRAWAL_TARGET, scenario.NORMAL_TARGET}
    if req.target not in allowed:
        raise HTTPException(status_code=400, detail="target 需為劇本情境中的出金地址")

    g = scenario.load_withdrawal_scenario()
    pipeline: PipelineResult = run_pipeline(g)
    sna_df, partition, risk_ratios, motif_hits = pipeline

    result = screen_withdrawal(
        g, req.target, req.amount_usdt, request_id=req.request_id, pipeline=pipeline
    )
    result["graph"] = graph_to_json(
        g,
        _evidences_for(g, sna_df, partition, risk_ratios, motif_hits),
        sna_df,
        motif_centers={hit.center for hit in motif_hits},
    )
    associations = result["associations"]
    result["highlight_path"] = (
        [str(node) for node in associations[0]["path"]] if associations else []
    )
    return result


@app.post("/graph")
def graph(
    req: GraphRequest,
    request: Request,
    x_api_key: str | None = Header(default=None),
) -> dict[str, Any]:
    """工作台圖譜：回傳節點、邊、meta 與依風險排序的 SNA 指標表。"""
    _check_api_key(x_api_key)
    _rate_limit(request)

    if req.mode == "example":
        g = tron.load_example_graph()
    else:
        if not req.address:
            raise HTTPException(status_code=400, detail="tron 模式需提供 address")
        if not tron.is_valid_tron_address(req.address):
            raise HTTPException(
                status_code=400,
                detail="address 需為合法 TRON 主網地址（T 開頭 Base58 34 字元）",
            )
        _check_api_key(x_api_key, required=True)
        try:
            g = tron.fetch_two_hop_graph(req.address, api_key=os.getenv("TRONGRID_API_KEY"))
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=502, detail=f"TronGrid 抓取失敗：{exc.__class__.__name__}"
            ) from exc
        if g.number_of_nodes() == 0:
            raise HTTPException(status_code=404, detail=f"地址 {req.address} 查無 USDT 轉帳")

    sna_df, partition, risk_ratios, motif_hits = run_pipeline(g)
    evidences = _evidences_for(g, sna_df, partition, risk_ratios, motif_hits)
    payload = graph_to_json(
        g, evidences, sna_df, motif_centers={hit.center for hit in motif_hits}
    )
    payload["sna"] = sna_table(sna_df, evidences)
    return payload


def _build_graph(req: ScoreRequest, x_api_key: str | None = None) -> tuple[nx.DiGraph, Any]:
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
        # 這行會實際呼叫 TronGrid 並消耗伺服器端的第三方 API 額度：
        # 未設定 CHAINLENS_API_KEY 時直接停用，避免公開端點被拿來盜刷額度。
        _check_api_key(x_api_key, required=True)
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
def score(
    req: ScoreRequest,
    request: Request,
    x_api_key: str | None = Header(default=None),
) -> dict[str, Any]:
    """對目標地址/交易評分，回傳 risk_score、label 與結構證據。"""
    _check_api_key(x_api_key)
    _rate_limit(request)
    g, target = _build_graph(req, x_api_key)
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
