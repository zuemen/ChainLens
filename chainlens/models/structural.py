"""結構模型（GraphSAGE）之即時推論：純 numpy，不依賴 torch，可跑在 Vercel serverless。

雙引擎設計中的第二引擎：
- 規則引擎抓「已寫進規則的手法」（集資、分散、集散、剝洋蔥），每個判定附證據鏈與 STR 草稿。
- 結構模型抓「結構像洗錢、但沒有任何規則命中」的變體（例：快進快出中繼）。
  模型只能把「放行」升到「加強審查」，不能單獨暫緩出金——暫緩必須有可稽核的證據鏈。

模型輸入不是 Elliptic 的 165 維特徵，而是任何交易圖都算得出的結構特徵
（見 FEATURE_NAMES），因此劇本圖與 TRON 即時圖都能推論。
權重由 chainlens/models/train_structural.py 在合成劇本圖上訓練後匯出成 JSON。
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from statistics import median
from typing import Any

import networkx as nx
import numpy as np

WEIGHTS_PATH = Path(__file__).with_name("weights") / "structural_sage.json"

FEATURE_NAMES = (
    "log_in_degree",
    "log_out_degree",
    "log_in_amount",
    "log_out_amount",
    "forward_ratio",  # 轉出／（轉入＋轉出）：≈0.5 表示原封不動往下傳
    "log_dwell_seconds",  # 資金停留時間（轉入中位時間 → 轉出中位時間）
    "has_in",
    "has_out",
    "log_active_span",  # 首筆到末筆的活躍時間跨度
    "log_burst_in",  # 一小時內最多不同來源數
    "log_burst_out",  # 一小時內最多不同去向數
    "out_amount_cv",  # 轉出金額變異係數：拆單／車手分潤金額高度一致 → 接近 0
    "known_entity",  # 已標註合法實體（交易所熱錢包等）
)

_WINDOW = 3600.0
_NO_TIME = 30 * 86_400.0  # 無時間資訊時的停留／跨度哨兵值（30 天）


def _burst(events: list[tuple[float | None, Any]]) -> int:
    if not events:
        return 0
    if any(ts is None for ts, _ in events):
        return len({p for _, p in events})
    events = sorted(events, key=lambda e: e[0])
    best, left = 0, 0
    for right in range(len(events)):
        while events[right][0] - events[left][0] > _WINDOW:
            left += 1
        best = max(best, len({p for _, p in events[left : right + 1]}))
    return best


def node_features(g: nx.DiGraph) -> tuple[list[Any], np.ndarray]:
    """對每個節點計算 FEATURE_NAMES 對應的原始特徵（尚未標準化）。"""
    nodes = list(g.nodes())
    rows: list[list[float]] = []
    for n in nodes:
        ins = list(g.in_edges(n, data=True))
        outs = list(g.out_edges(n, data=True))
        in_amt = [float(d.get("amount") or 0.0) for _, _, d in ins]
        out_amt = [float(d.get("amount") or 0.0) for _, _, d in outs]
        in_ts = [d.get("timestamp") for _, _, d in ins if d.get("timestamp") is not None]
        out_ts = [d.get("timestamp") for _, _, d in outs if d.get("timestamp") is not None]
        total_in, total_out = sum(in_amt), sum(out_amt)
        forward = total_out / (total_in + total_out) if (total_in + total_out) > 0 else 0.0
        if in_ts and out_ts:
            dwell = max(0.0, float(median(out_ts)) - float(median(in_ts)))
        else:
            dwell = _NO_TIME
        all_ts = [float(t) for t in in_ts + out_ts]
        span = (max(all_ts) - min(all_ts)) if len(all_ts) >= 2 else _NO_TIME
        cv = (float(np.std(out_amt)) / float(np.mean(out_amt))) if len(out_amt) >= 2 else 1.0
        rows.append(
            [
                np.log1p(len({u for u, _, _ in ins})),
                np.log1p(len({v for _, v, _ in outs})),
                np.log1p(total_in),
                np.log1p(total_out),
                forward,
                np.log1p(dwell),
                1.0 if ins else 0.0,
                1.0 if outs else 0.0,
                np.log1p(span),
                np.log1p(_burst([(d.get("timestamp"), u) for u, _, d in ins])),
                np.log1p(_burst([(d.get("timestamp"), v) for _, v, d in outs])),
                min(cv, 3.0),
                1.0 if g.nodes[n].get("known_entity") else 0.0,
            ]
        )
    return nodes, np.asarray(rows, dtype=np.float64)


def _mean_neighbors(x: np.ndarray, src: np.ndarray, dst: np.ndarray, n: int) -> np.ndarray:
    """PyG SAGEConv 的 mean 聚合：dst 節點取所有 src 鄰居特徵平均；無鄰居 → 0。"""
    out = np.zeros((n, x.shape[1]), dtype=np.float64)
    if src.size:
        np.add.at(out, dst, x[src])
        counts = np.bincount(dst, minlength=n).astype(np.float64)
        nz = counts > 0
        out[nz] /= counts[nz, None]
    return out


@dataclass(frozen=True)
class StructuralModel:
    """兩層 GraphSAGE（reverse message passing）的 numpy 前向傳播。"""

    params: dict[str, np.ndarray]
    mean: np.ndarray
    std: np.ndarray
    meta: dict[str, Any]

    @classmethod
    def load(cls, path: Path = WEIGHTS_PATH) -> StructuralModel:
        raw = json.loads(path.read_text(encoding="utf-8"))
        params = {k: np.asarray(v, dtype=np.float64) for k, v in raw["params"].items()}
        return cls(
            params=params,
            mean=np.asarray(raw["norm"]["mean"], dtype=np.float64),
            std=np.asarray(raw["norm"]["std"], dtype=np.float64),
            meta=raw.get("meta", {}),
        )

    def _sage(self, name: str, x: np.ndarray, src: np.ndarray, dst: np.ndarray) -> np.ndarray:
        p = self.params
        agg = _mean_neighbors(x, src, dst, x.shape[0])
        out = agg @ p[f"{name}.lin_l.weight"].T + p[f"{name}.lin_l.bias"]
        return out + x @ p[f"{name}.lin_r.weight"].T

    def predict(self, g: nx.DiGraph) -> dict[Any, float]:
        """回傳每個節點屬於「洗錢基礎設施」的機率。"""
        nodes, raw = node_features(g)
        if not nodes:
            return {}
        x = (raw - self.mean) / self.std
        index = {n: i for i, n in enumerate(nodes)}
        src = np.asarray([index[u] for u, _ in g.edges()], dtype=np.int64)
        dst = np.asarray([index[v] for _, v in g.edges()], dtype=np.int64)
        # 正向：資金從哪來（聚合入邊來源）；反向：資金往哪去（聚合出邊目標）
        h = np.concatenate(
            [self._sage("conv1", x, src, dst), self._sage("conv1_rev", x, dst, src)], axis=1
        )
        h = np.maximum(h, 0.0)
        logits = self._sage("conv2", h, src, dst) + self._sage("conv2_rev", h, dst, src)
        logits -= logits.max(axis=1, keepdims=True)
        prob = np.exp(logits)
        prob /= prob.sum(axis=1, keepdims=True)
        return {n: float(prob[i, 1]) for n, i in index.items()}


@lru_cache(maxsize=1)
def default_model() -> StructuralModel | None:
    """已匯出的權重存在時載入；不存在（尚未訓練）時回 None，審查引擎退回單引擎。"""
    if not WEIGHTS_PATH.is_file():
        return None
    return StructuralModel.load(WEIGHTS_PATH)
