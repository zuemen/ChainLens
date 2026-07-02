"""詐騙圖樣偵測測試。"""

import networkx as nx

from chainlens.sna import motifs


def test_fan_in_hits_collector(scam_graph: nx.DiGraph) -> None:
    hits = motifs.detect_fan_in(scam_graph, min_degree=5, window_seconds=3600)
    assert [h.center for h in hits] == ["collector"]
    assert "collector" in hits[0].nodes
    assert "扇入" in hits[0].description_zh


def test_fan_out_hits_hub(scam_graph: nx.DiGraph) -> None:
    hits = motifs.detect_fan_out(scam_graph, min_degree=5, window_seconds=3600)
    assert [h.center for h in hits] == ["hub"]
    assert "分散" in hits[0].description_zh


def test_peeling_chain(scam_graph: nx.DiGraph) -> None:
    hits = motifs.detect_peeling_chain(scam_graph, min_hops=3, keep_ratio=0.8)
    assert len(hits) == 1
    assert hits[0].center == "p0"
    for node in ("p0", "p1", "p2", "p3", "p4"):
        assert node in hits[0].nodes
    assert "剝洋蔥" in hits[0].description_zh


def test_normal_nodes_not_hit(scam_graph: nx.DiGraph) -> None:
    centers = {h.center for h in motifs.detect_all(scam_graph)}
    assert centers.isdisjoint({"n0", "n1", "n2"})


def test_fan_in_without_timestamps() -> None:
    g = nx.DiGraph()
    for i in range(6):
        g.add_edge(f"s{i}", "c")  # 無 timestamp / amount 屬性
    hits = motifs.detect_fan_in(g, min_degree=5, window_seconds=3600)
    assert [h.center for h in hits] == ["c"]


def test_slow_fan_in_excluded_by_window() -> None:
    g = nx.DiGraph()
    for i in range(6):
        g.add_edge(f"s{i}", "c", timestamp=i * 7200)  # 每 2 小時一筆
    assert motifs.detect_fan_in(g, min_degree=5, window_seconds=600) == []
    assert len(motifs.detect_fan_in(g, min_degree=5, window_seconds=None)) == 1
