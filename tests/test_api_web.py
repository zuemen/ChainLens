"""網站專用端點測試：POST /screen 與 POST /graph。"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from chainlens.api.main import app

client = TestClient(app)


def test_screen_blocks_the_scenario_target() -> None:
    """本案主角：自身乾淨、上游髒，必須被關聯分數攔下。"""
    response = client.post("/screen", json={"target": "TOtcOut01", "amount_usdt": 500000.0})
    assert response.status_code == 200
    body = response.json()
    assert body["target"] == "TOtcOut01"
    assert body["risk_score"] == pytest.approx(0.7307, abs=1e-4)
    assert body["self_score"] == pytest.approx(0.3268, abs=1e-4)
    assert body["association_score"] == pytest.approx(0.6, abs=1e-4)
    assert body["decision"] == "block"
    assert body["decision_zh"] == "暫緩出金並啟動人工審查"
    assert len(body["associations"]) == 6
    assert body["str_draft_zh"]
    assert body["evidence"]["motif_hits"] == []  # 自身不命中任何圖樣，這是整個 Demo 的論點


def test_screen_passes_the_control_target() -> None:
    """對照組：同一套引擎不得誤殺正常用戶。"""
    response = client.post("/screen", json={"target": "TNormalUser01", "amount_usdt": 500000.0})
    assert response.status_code == 200
    body = response.json()
    assert body["risk_score"] == pytest.approx(0.0962, abs=1e-4)
    assert body["decision"] == "pass"
    assert body["associations"] == []
    assert body["str_draft_zh"] is None


def test_screen_returns_graph_and_highlight_path() -> None:
    response = client.post("/screen", json={"target": "TOtcOut01", "amount_usdt": 500000.0})
    body = response.json()
    assert body["graph"]["meta"]["node_count"] == 53
    assert body["graph"]["meta"]["edge_count"] == 63
    assert body["highlight_path"] == ["TAggregator01", "TMule03", "TOtcOut01"]


def test_screen_highlight_path_empty_when_no_associations() -> None:
    response = client.post("/screen", json={"target": "TNormalUser01", "amount_usdt": 500000.0})
    assert response.json()["highlight_path"] == []


def test_screen_rejects_targets_outside_the_scenario() -> None:
    """白名單：避免端點淪為任意圖計算的公開資源。"""
    response = client.post("/screen", json={"target": "TAggregator01", "amount_usdt": 1000.0})
    assert response.status_code == 400
    assert response.json()["detail"] == "target 需為劇本情境中的出金地址"


def test_screen_rejects_non_positive_amount() -> None:
    response = client.post("/screen", json={"target": "TOtcOut01", "amount_usdt": 0})
    assert response.status_code == 422


def test_cors_headers_present() -> None:
    response = client.options(
        "/screen",
        headers={
            "Origin": "https://example.vercel.app",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "*"
