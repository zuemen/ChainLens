"""TRON 抓取器測試：mock 網路層，不打真實 API。"""

from pathlib import Path

import pytest

from chainlens.data import tron
from chainlens.sna.motifs import detect_all


def test_parse_transfers() -> None:
    payload = {
        "data": [
            {
                "from": "TAlice",
                "to": "TBob",
                "value": "12500000",
                "block_timestamp": 1750000000000,
                "token_info": {"symbol": "USDT", "decimals": 6},
            },
            # 格式錯誤的紀錄應被略過
            {"from": "TBob", "to": "TCarol", "value": "bad", "block_timestamp": 1},
        ]
    }
    assert tron._parse_transfers(payload) == [
        {"from": "TAlice", "to": "TBob", "amount": 12.5, "timestamp": 1750000000}
    ]


def test_build_graph_aggregates_parallel_edges() -> None:
    transfers = [
        {"from": "a", "to": "b", "amount": 1.0, "timestamp": 100},
        {"from": "a", "to": "b", "amount": 2.0, "timestamp": 50},
    ]
    g = tron.build_graph_from_transfers(transfers)
    assert g["a"]["b"]["amount"] == 3.0
    assert g["a"]["b"]["timestamp"] == 50


def test_example_graph_contains_motifs() -> None:
    g = tron.load_example_graph()
    assert g.number_of_nodes() > 10
    assert g.graph["center"] in g
    kinds = {h.motif for h in detect_all(g)}
    assert {"fan_in", "fan_out", "peeling_chain"} <= kinds


def test_cache_roundtrip(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []

    def fake_fetch(address: str, api_key: str | None, client: object) -> list[dict]:
        calls.append(address)
        return [{"from": address, "to": "TPeer", "amount": 1.0, "timestamp": 100}]

    monkeypatch.setattr(tron, "_fetch_transfers", fake_fetch)
    g1 = tron.fetch_two_hop_graph("TCenter", cache_dir=tmp_path)
    assert calls == ["TCenter", "TPeer"]  # 中心 + 1 個對手方

    g2 = tron.fetch_two_hop_graph("TCenter", cache_dir=tmp_path)
    assert calls == ["TCenter", "TPeer"]  # 第二次走快取，不再打網路
    assert set(g1.edges()) == set(g2.edges())
    assert g2.graph["center"] == "TCenter"
