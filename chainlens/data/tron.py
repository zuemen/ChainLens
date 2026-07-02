"""TronGrid TRC-20 USDT 轉帳抓取器：以指定地址為中心建 2-hop 金流圖。

- API key 讀環境變數 TRONGRID_API_KEY；無 key 時降級為匿名限速模式（每請求延遲）
- 回應 JSON 快取於 data/cache/，離線或重複查詢直接讀快取
- 無網路時可改用 load_example_graph() 內建範例圖
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

import httpx
import networkx as nx

USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"  # TRON 主網 USDT
BASE_URL = "https://api.trongrid.io/v1/accounts/{address}/transactions/trc20"
ANON_DELAY_SECONDS = 0.5  # 無 API key 時的匿名限速延遲
DEFAULT_CACHE_DIR = Path("data/cache")


def _parse_transfers(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """TronGrid trc20 回應 → 標準化轉帳列表（金額換算小數、時間戳 ms→s）。"""
    transfers: list[dict[str, Any]] = []
    for item in payload.get("data", []):
        token = item.get("token_info") or {}
        try:
            decimals = int(token.get("decimals", 6))
            transfers.append(
                {
                    "from": item["from"],
                    "to": item["to"],
                    "amount": int(item["value"]) / 10**decimals,
                    "timestamp": int(item["block_timestamp"]) // 1000,
                }
            )
        except (KeyError, TypeError, ValueError):
            continue  # 略過缺欄位或格式錯誤的紀錄
    return transfers


def _fetch_transfers(
    address: str, api_key: str | None, client: httpx.Client
) -> list[dict[str, Any]]:
    """抓取單一地址的 TRC-20 USDT 轉帳（單頁，最多 200 筆）。"""
    headers = {"TRON-PRO-API-KEY": api_key} if api_key else {}
    if not api_key:
        time.sleep(ANON_DELAY_SECONDS)
    response = client.get(
        BASE_URL.format(address=address),
        params={"only_confirmed": "true", "limit": 200, "contract_address": USDT_CONTRACT},
        headers=headers,
        timeout=15.0,
    )
    response.raise_for_status()
    return _parse_transfers(response.json())


def build_graph_from_transfers(transfers: list[dict[str, Any]]) -> nx.DiGraph:
    """轉帳列表 → 有向圖；平行轉帳聚合為單邊（金額加總、取最早時間戳）。"""
    g = nx.DiGraph()
    for t in transfers:
        u, v = t["from"], t["to"]
        if g.has_edge(u, v):
            data = g[u][v]
            data["amount"] += t["amount"]
            data["timestamp"] = min(data["timestamp"], t["timestamp"])
        else:
            g.add_edge(u, v, amount=t["amount"], timestamp=t["timestamp"])
    return g


def fetch_two_hop_graph(
    address: str,
    api_key: str | None = None,
    cache_dir: Path | None = DEFAULT_CACHE_DIR,
    max_neighbors: int = 8,
) -> nx.DiGraph:
    """以 address 為中心抓取 2-hop USDT 金流圖（對手方最多 max_neighbors 個）。"""
    cache_file = cache_dir / f"{address}_2hop.json" if cache_dir else None
    if cache_file and cache_file.exists():
        transfers = json.loads(cache_file.read_text(encoding="utf-8"))
    else:
        with httpx.Client() as client:
            transfers = _fetch_transfers(address, api_key, client)
            neighbors: list[str] = []
            for t in transfers:
                peer = t["to"] if t["from"] == address else t["from"]
                if peer != address and peer not in neighbors:
                    neighbors.append(peer)
            for peer in neighbors[:max_neighbors]:
                transfers.extend(_fetch_transfers(peer, api_key, client))
        if cache_file:
            cache_file.parent.mkdir(parents=True, exist_ok=True)
            cache_file.write_text(json.dumps(transfers, ensure_ascii=False), encoding="utf-8")
    g = build_graph_from_transfers(transfers)
    g.graph["center"] = address
    return g


def load_example_graph() -> nx.DiGraph:
    """內建離線範例圖：含集資扇入、快速分散與剝洋蔥鏈三種圖樣＋正常交易背景。"""
    g = nx.DiGraph()
    t0 = 1_750_000_000
    center = "TScamCollector001"
    for i in range(8):
        g.add_edge(f"TVictim{i:02d}", center, amount=500.0 + i * 40, timestamp=t0 + i * 90)
    hub = "TLaunderHub001"
    g.add_edge(center, hub, amount=3800.0, timestamp=t0 + 900)
    for i in range(6):
        g.add_edge(hub, f"TMule{i:02d}", amount=600.0, timestamp=t0 + 1000 + i * 40)
    # 剝洋蔥鏈：自 TMule00 起，每跳保留 90% 轉出＋10% 剝離
    previous = "TMule00"
    for i, amount in enumerate([540.0, 486.0, 437.4]):
        nxt = f"TPeel{i:02d}"
        g.add_edge(previous, nxt, amount=amount, timestamp=t0 + 1400 + i * 120)
        g.add_edge(previous, f"TSide{i:02d}", amount=amount / 9, timestamp=t0 + 1410 + i * 120)
        previous = nxt
    # 正常交易背景
    g.add_edge("TShopA", "TShopB", amount=25.0, timestamp=t0 + 50)
    g.add_edge("TShopB", "TShopC", amount=12.5, timestamp=t0 + 500)
    g.graph["center"] = center
    return g
