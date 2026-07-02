"""鏈鏡 ChainLens Streamlit Demo 工作台。

輸入 TRON 地址 → 抓取 2-hop USDT 金流圖 → PyVis 互動圖譜
（節點大小 = PageRank、紅色 = 高風險 / 圖樣命中）＋側欄風險證據敘事。
無網路或抓取失敗時自動載入內建範例圖。

啟動：streamlit run chainlens/app/workbench.py（或 make app）
"""

from __future__ import annotations

import os
from typing import Any

import networkx as nx
import streamlit as st
import streamlit.components.v1 as components
from pyvis.network import Network

from chainlens.data import tron
from chainlens.explain.evidence import generate_evidence, run_pipeline

HIGH_RISK_THRESHOLD = 0.7


def load_graph(address: str, use_example: bool) -> tuple[nx.DiGraph, bool]:
    """回傳（圖, 是否為降級範例圖）。"""
    if use_example or not address:
        return tron.load_example_graph(), False
    try:
        return (
            tron.fetch_two_hop_graph(address, api_key=os.getenv("TRONGRID_API_KEY")),
            False,
        )
    except Exception:
        return tron.load_example_graph(), True


def build_pyvis_html(
    g: nx.DiGraph, evidences: dict[Any, dict], hit_nodes: set[Any], pagerank: dict[Any, float]
) -> str:
    """把分析結果渲染為 PyVis 互動網頁。"""
    net = Network(
        height="650px", width="100%", directed=True, bgcolor="#111111", font_color="#eeeeee"
    )
    for node in g.nodes():
        score = evidences[node]["score"]
        risky = node in hit_nodes or score >= HIGH_RISK_THRESHOLD
        net.add_node(
            str(node),
            label=str(node)[:12],
            title=f"{node}\nscore={score:.2f}（{evidences[node]['label']}）",
            color="#e74c3c" if risky else "#5dade2",
            size=float(10 + pagerank.get(node, 0.0) * 300),
        )
    for u, v, d in g.edges(data=True):
        amount = float(d.get("amount", 0.0))
        net.add_edge(str(u), str(v), value=max(amount, 1.0), title=f"{amount:,.2f} USDT")
    return net.generate_html()


def main() -> None:
    st.set_page_config(page_title="鏈鏡 ChainLens", layout="wide")
    st.title("鏈鏡 ChainLens — 詐騙金流偵測工作台")
    st.caption("SNA + 圖樣規則 + 可解釋證據｜研究用途，非投資或法律建議")

    address = st.text_input("TRON 地址（TRC-20 USDT）", placeholder="T 開頭主網地址…")
    use_example = st.checkbox("使用內建範例圖（離線 Demo）", value=not address)

    g, degraded = load_graph(address.strip(), use_example)
    if degraded:
        st.warning("TronGrid 抓取失敗（無網路或限速），已改用內建範例圖。")

    sna_df, partition, risk_ratios, motif_hits = run_pipeline(g)
    hit_nodes = {n for hit in motif_hits for n in hit.nodes} | {h.center for h in motif_hits}
    evidences = {
        n: generate_evidence(n, g, sna_df, partition, risk_ratios, motif_hits)
        for n in g.nodes()
    }
    pagerank = sna_df["pagerank"].to_dict()

    with st.sidebar:
        st.header("風險證據面板")
        ranked = sorted(g.nodes(), key=lambda n: evidences[n]["score"], reverse=True)
        node = st.selectbox("選擇節點（依風險排序）", ranked)
        ev = evidences[node]
        st.metric("風險分數", f"{ev['score']:.2f}", ev["label"])
        st.write(ev["narrative_zh"])
        with st.expander("結構證據 JSON"):
            st.json(ev)

    st.subheader(f"金流圖譜（{g.number_of_nodes()} 節點 / {g.number_of_edges()} 邊）")
    components.html(build_pyvis_html(g, evidences, hit_nodes, pagerank), height=680)

    st.dataframe(
        sna_df.assign(score=[evidences[n]["score"] for n in sna_df.index])
        .sort_values("score", ascending=False)
        .head(15),
        use_container_width=True,
    )


if __name__ == "__main__":
    main()
