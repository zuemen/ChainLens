"""FastAPI /score 端點測試（example 模式，不依賴網路與資料集）。"""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from chainlens.api import main as api_main
from chainlens.api.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_score_example_mode() -> None:
    response = client.post("/score", json={"address": "TDemoAddress", "mode": "example"})
    assert response.status_code == 200
    body = response.json()
    assert 0.0 <= body["risk_score"] <= 1.0
    assert body["label"] in {"high", "medium", "low"}
    assert body["evidence"]
    assert body["evidence"][0]["narrative_zh"]
    assert body["evidence"][0]["motif_hits"]  # 範例圖中心必命中圖樣


def test_score_known_node_in_example_graph() -> None:
    response = client.post("/score", json={"address": "TShopA", "mode": "example"})
    assert response.status_code == 200
    assert response.json()["target"] == "TShopA"


def test_score_requires_target() -> None:
    response = client.post("/score", json={"mode": "example"})
    assert response.status_code in (400, 422)


def test_elliptic_mode_without_dataset(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from chainlens.api import main as api_main

    monkeypatch.setattr(api_main, "RAW_DIR", tmp_path / "empty")
    response = client.post("/score", json={"tx_id": "123", "mode": "elliptic"})
    assert response.status_code == 404  # 無資料集時應回 404 與說明


def test_tron_mode_rejects_invalid_address() -> None:
    response = client.post("/score", json={"address": "../../etc", "mode": "tron"})
    assert response.status_code == 400
    response = client.post("/score", json={"address": "TTooShort", "mode": "tron"})
    assert response.status_code == 400


def test_tron_fetch_failure_returns_502_not_example_graph(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """TronGrid 失敗必須回 502，不得靜默回傳內建範例圖的假高風險分數。"""
    import httpx

    from chainlens.api import main as api_main

    def boom(*args: object, **kwargs: object) -> None:
        raise httpx.ConnectError("network down")

    monkeypatch.setattr(api_main.tron, "fetch_two_hop_graph", boom)
    # tron 實抓路徑會消耗伺服器端的 TronGrid 額度，依規則必須帶 X-API-Key
    monkeypatch.setenv("CHAINLENS_API_KEY", "secret-key")
    response = client.post(
        "/score",
        json={"address": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", "mode": "tron"},
        headers={"X-API-Key": "secret-key"},
    )
    assert response.status_code == 502
    assert "TScamCollector001" not in response.text


def test_api_key_enforced_when_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CHAINLENS_API_KEY", "secret-key")
    body = {"address": "TDemoAddress", "mode": "example"}
    assert client.post("/score", json=body).status_code == 401
    ok = client.post("/score", json=body, headers={"X-API-Key": "secret-key"})
    assert ok.status_code == 200


def test_tron_live_fetch_requires_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    """未設定 CHAINLENS_API_KEY 時，會動用 TronGrid 額度的路徑必須停用（fail-closed）。"""
    from chainlens.api import main as api_main

    def must_not_be_called(*args: object, **kwargs: object) -> None:
        raise AssertionError("未授權就不該呼叫 TronGrid")

    monkeypatch.delenv("CHAINLENS_API_KEY", raising=False)
    monkeypatch.setattr(api_main.tron, "fetch_two_hop_graph", must_not_be_called)
    response = client.post(
        "/score",
        json={"address": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", "mode": "tron"},
    )
    assert response.status_code == 503


def test_root_redirects_to_docs_without_site(tmp_path, monkeypatch) -> None:
    """純 API 部署（沒有建置 Demo 網站）時，根路徑導向互動式 API 文件。"""
    monkeypatch.setattr(api_main, "SITE_DIR", tmp_path)
    response = client.get("/", follow_redirects=False)
    assert response.status_code in (307, 308)
    assert response.headers["location"] == "/docs"
    assert "swagger" in client.get("/").text.lower()


def _fake_site(tmp_path, monkeypatch) -> None:
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<!doctype html><title>site</title>", encoding="utf-8")
    (tmp_path / "assets" / "app.js").write_text("console.log(1)", encoding="utf-8")
    monkeypatch.setattr(api_main, "SITE_DIR", tmp_path)


def test_root_serves_site_when_built(tmp_path, monkeypatch) -> None:
    _fake_site(tmp_path, monkeypatch)
    response = client.get("/", follow_redirects=False)
    assert response.status_code == 200
    assert "<title>site</title>" in response.text
    assert response.headers["cache-control"] == "no-cache"


def test_site_assets_and_spa_routes(tmp_path, monkeypatch) -> None:
    """靜態資產照實回傳；前端路由（重新整理 /screening）回 index.html 而非 404。"""
    _fake_site(tmp_path, monkeypatch)
    assert client.get("/assets/app.js").text == "console.log(1)"
    assert "<title>site</title>" in client.get("/screening").text
    assert client.get("/no-such-page").status_code == 404
    # API 路由不受 catch-all 影響
    assert client.get("/health").json() == {"status": "ok"}
    assert "swagger" in client.get("/docs").text.lower()


def test_site_blocks_path_traversal(tmp_path, monkeypatch) -> None:
    site_dir = tmp_path / "public"
    site_dir.mkdir()
    (tmp_path / "secret.txt").write_text("nope", encoding="utf-8")
    _fake_site(site_dir, monkeypatch)
    response = client.get("/%2e%2e/secret.txt")
    assert response.status_code == 404
    assert "nope" not in response.text


def test_spa_route_falls_back_to_root_without_site(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(api_main, "SITE_DIR", tmp_path)
    response = client.get("/screening", follow_redirects=False)
    assert response.status_code in (307, 308)
    assert response.headers["location"] == "/"


def test_favicon_no_content() -> None:
    """瀏覽器自動索取 favicon，回 204 避免無謂的 404 噪音。"""
    assert client.get("/favicon.ico").status_code == 204


def test_favicon_png_no_content() -> None:
    """瀏覽器亦會索取 /favicon.png，一併回 204。"""
    assert client.get("/favicon.png").status_code == 204
