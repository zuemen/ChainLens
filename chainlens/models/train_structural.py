"""訓練結構模型（GraphSAGE + reverse message passing）並匯出成 numpy 可讀的 JSON 權重。

用法：
    .venv/Scripts/python.exe -m chainlens.models.train_structural [--graphs 240] [--epochs 400]

訓練資料是隨機化的合成劇本圖（generate_training_graph）：
- 假投資詐騙鏈路：被害人 → 客服收款 → 集資主錢包 → 車手 → 剝洋蔥／直轉 → OTC 出金，
  隨機附加「拆單人頭 → 整合地址」與「快進快出中繼」變體。
- 合法背景：商家往來、已標註／未標註的交易所熱錢包批次出金、慢速轉手的正常用戶。
標籤：詐團控制的基礎設施 = 1；被害人、商家、熱錢包、交易所用戶 = 0。

模型只看結構特徵（structural.FEATURE_NAMES），沒有任何地址名稱資訊，
因此劇本圖的招牌情境不是訓練集的一部分（測試以 tests/test_structural.py 鎖定）。
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import networkx as nx
import numpy as np

from chainlens.models.structural import FEATURE_NAMES, WEIGHTS_PATH, node_features

LAUNDERING_ROLES = {
    "support",
    "aggregator",
    "mule",
    "peel",
    "peel_side",
    "otc",
    "downstream",
    "smurf",
    "split_collector",
    "relay",
}


def _add(g: nx.DiGraph, u: str, v: str, amount: float, ts: float, rng: random.Random) -> None:
    # 同一對地址多筆時 DiGraph 只留一條邊：合併金額、時間取較早者
    if g.has_edge(u, v):
        g[u][v]["amount"] += amount
        g[u][v]["timestamp"] = min(g[u][v]["timestamp"], ts)
    else:
        g.add_edge(u, v, amount=amount, timestamp=ts)


def generate_training_graph(seed: int) -> nx.DiGraph:
    rng = random.Random(seed)
    g = nx.DiGraph()
    t0 = 1_700_000_000 + rng.randint(0, 10_000_000)
    tag = f"g{seed}"

    def role(name: str, r: str, **attrs: object) -> str:
        g.add_node(name, role=r, **attrs)
        return name

    # ---------- 詐騙鏈路（0～2 個詐團） ----------
    for k in range(rng.choice([0, 1, 1, 1, 2])):
        n_victims = rng.randint(6, 22)
        n_support = rng.randint(1, 4)
        victims = [role(f"{tag}V{k}_{i}", "victim") for i in range(n_victims)]
        supports = [role(f"{tag}S{k}_{i}", "support") for i in range(n_support)]
        agg = role(f"{tag}A{k}", "aggregator")
        window = rng.uniform(1_200, 9_000)
        for v in victims:
            for s in rng.sample(supports, k=min(len(supports), rng.choice([1, 1, 1, 2]))):
                _add(g, v, s, rng.uniform(3_000, 70_000), t0 + rng.uniform(0, window), rng)
            if rng.random() < 0.3:
                _add(g, v, agg, rng.uniform(3_000, 30_000), t0 + rng.uniform(0, window), rng)
        for s in supports:
            total = sum(d["amount"] for _, _, d in g.in_edges(s, data=True))
            _add(g, s, agg, total, t0 + window + rng.uniform(300, 1_500), rng)
        pooled = sum(d["amount"] for _, _, d in g.in_edges(agg, data=True))
        n_mules = rng.randint(4, 9)
        share = pooled / n_mules
        mules = [role(f"{tag}M{k}_{i}", "mule") for i in range(n_mules)]
        t_mule = t0 + window + rng.uniform(1_800, 4_000)
        otcs = [role(f"{tag}O{k}_{i}", "otc") for i in range(rng.randint(1, 3))]
        for i, m in enumerate(mules):
            amt = share * rng.uniform(0.94, 1.06)
            _add(g, agg, m, amt, t_mule + i * rng.uniform(120, 400), rng)
            sink = rng.choice(otcs)
            t = t_mule + rng.uniform(1_500, 5_000)
            if rng.random() < 0.6:
                prev, cur = m, amt
                for hop in range(rng.randint(2, 4)):
                    nxt = role(f"{tag}P{k}_{i}_{hop}", "peel")
                    keep = rng.uniform(0.85, 0.95)
                    _add(g, prev, nxt, cur * keep, t + hop * rng.uniform(300, 900), rng)
                    _add(
                        g, prev, role(f"{tag}Q{k}_{i}_{hop}", "peel_side"),
                        cur * (1 - keep), t + hop * rng.uniform(300, 900) + 60, rng,
                    )
                    prev, cur = nxt, cur * keep
                _add(g, prev, sink, cur, t + 4 * 700, rng)
            else:
                _add(g, m, sink, amt, t, rng)
        # 變體一：OTC 之後再轉一手／快進快出中繼鏈
        for o in otcs:
            if rng.random() < 0.5:
                total = sum(d["amount"] for _, _, d in g.in_edges(o, data=True))
                prev, t = o, t_mule + rng.uniform(6_000, 12_000)
                hops = rng.randint(1, 4)
                for hop in range(hops):
                    r = role(f"{tag}R{k}_{o[-1]}_{hop}", "relay" if hops > 1 else "downstream")
                    amt_r = total * rng.uniform(0.6, 1.0)
                    _add(g, prev, r, amt_r, t + hop * rng.uniform(240, 900), rng)
                    prev = r
        # 變體二：拆單——主錢包經 n 個人頭各轉一筆小額到整合地址
        if rng.random() < 0.5:
            n_smurf = rng.randint(6, 14)
            unit = rng.choice([2_900, 4_900, 9_000, 9_500, 14_000])
            coll = role(f"{tag}C{k}", "split_collector")
            for i in range(n_smurf):
                sm = role(f"{tag}U{k}_{i}", "smurf")
                _add(g, agg, sm, unit, t_mule + 5_000 + i * rng.uniform(60, 240), rng)
                t_sm = t_mule + 5_600 + i * rng.uniform(100, 300)
                _add(g, sm, coll, unit * rng.uniform(0.97, 1.0), t_sm, rng)

    # ---------- 合法背景（刻意多樣：合法世界也有「當天轉出」「一進一出」「金額一致」） ----------
    n_shops = rng.randint(4, 14)
    shops = [role(f"{tag}Shop{i}", "normal") for i in range(n_shops)]
    for _ in range(rng.randint(6, 40)):
        a, b = rng.sample(shops, 2)
        _add(g, a, b, rng.uniform(20, 6_000), t0 + rng.uniform(-86_400 * 30, 86_400 * 5), rng)
    # 商家當天付供應商：小額、幾小時內、部分金額的短鏈與循環
    for _ in range(rng.randint(1, 4)):
        chain = rng.sample(shops, k=min(len(shops), rng.randint(2, 4)))
        t = t0 + rng.uniform(0, 20_000)
        amt = rng.uniform(50, 2_500)
        for a, b in zip(chain, chain[1:]):
            _add(g, a, b, amt * rng.uniform(0.3, 1.0), t, rng)
            t += rng.uniform(600, 14_400)
        if rng.random() < 0.5:
            t_back = t + rng.uniform(600, 20_000)
            _add(g, chain[-1], chain[0], amt * rng.uniform(0.1, 0.5), t_back, rng)
    # 交易所熱錢包：長期活躍、多來源入、批次出、金額雜亂；一半有實體標註，一半沒有
    for h in range(rng.randint(1, 3)):
        labeled = rng.random() < 0.5
        entity = {"known_entity": "exchange_hot_wallet"} if labeled else {}
        hw = role(f"{tag}HW{h}", "hot_wallet", **entity)
        for _ in range(rng.randint(3, 14)):
            t_in = t0 - rng.uniform(3_600, 86_400 * 40)
            _add(g, rng.choice(shops), hw, rng.uniform(500, 40_000), t_in, rng)
        n_users = rng.randint(6, 40)
        t_batch = t0 + rng.uniform(0, 20_000)
        for i in range(n_users):
            u = role(f"{tag}EU{h}_{i}", "exchange_user")
            unit_out = rng.choice([120, 480, 1_250, 3_000, 640, 9_800, 2_100, 15_000, 55, 7_700])
            _add(g, hw, u, unit_out * rng.uniform(0.8, 1.2), t_batch + i * rng.uniform(15, 90), rng)
            # 用戶事後花掉／轉去商家：有人幾小時內、有人幾天後；金額多半不足額
            if rng.random() < 0.5:
                amt = g[hw][u]["amount"]
                delay = rng.choice([rng.uniform(900, 14_400), rng.uniform(86_400, 86_400 * 12)])
                frac = rng.uniform(0.1, 0.9)
                _add(g, u, rng.choice(shops), amt * frac, t_batch + delay, rng)
    # 正常用戶：收一筆後轉出——停留從十幾分鐘到二十天、金額 5%～100% 都有
    for i in range(rng.randint(4, 14)):
        u = role(f"{tag}N{i}", "normal")
        src = rng.choice(shops)
        amt = rng.uniform(100, 30_000)
        _add(g, src, u, amt, t0 + rng.uniform(0, 8_000), rng)
        if rng.random() < 0.8:
            delay = rng.choice(
                [
                    rng.uniform(600, 7_200),
                    rng.uniform(7_200, 86_400),
                    rng.uniform(86_400, 86_400 * 20),
                ]
            )
            frac = rng.choice([rng.uniform(0.05, 0.6), rng.uniform(0.6, 1.0)])
            _add(g, u, rng.choice(shops), amt * frac, t0 + 8_000 + delay, rng)
    # 外部來源：沒有轉入紀錄、只有幾筆轉出的合法節點（他鏈入金、法幣入金、舊錢包）。
    # 少了這一類，「純來源節點」在訓練集裡只剩被害人，
    # 模型會學到「收到純來源的錢＝詐團收款端」的假關聯
    for i in range(rng.randint(3, 10)):
        ext = role(f"{tag}X{i}", "normal")
        t = t0 + rng.uniform(-86_400 * 5, 20_000)
        for _ in range(rng.randint(1, 4)):
            if rng.random() < 0.5:
                dst = rng.choice(shops)
            else:
                dst = role(f"{tag}XU{i}_{rng.randint(0, 999)}", "normal")
            amt = rng.uniform(50, 25_000)
            _add(g, ext, dst, amt, t + rng.uniform(0, 6_000), rng)
            if rng.random() < 0.6:
                t_spend = t + rng.uniform(1_800, 86_400 * 10)
                _add(g, dst, rng.choice(shops), amt * rng.uniform(0.05, 0.6), t_spend, rng)
    # 被害人也不是純來源：有些人先從外部收過錢（薪水、他鏈入金）
    for n, d in list(g.nodes(data=True)):
        if d.get("role") == "victim" and rng.random() < 0.5:
            src = role(f"{tag}XV{n[-3:]}_{rng.randint(0, 999)}", "normal")
            t_salary = t0 - rng.uniform(3_600, 86_400 * 30)
            _add(g, src, n, rng.uniform(5_000, 80_000), t_salary, rng)

    # 小型經濟圈：純來源入金給 2～4 個新地址，它們當天互相小額往來（含循環）。
    # 劇本圖的背景交易就是這種形狀；規模小、金額小、沒有集中再分散
    for i in range(rng.randint(2, 6)):
        src = role(f"{tag}E{i}", "normal")
        members = [role(f"{tag}E{i}_{j}", "normal") for j in range(rng.randint(2, 4))]
        t = t0 + rng.uniform(-86_400 * 3, 10_000)
        for mbr in rng.sample(members, k=rng.randint(1, len(members))):
            _add(g, src, mbr, rng.uniform(200, 5_000), t + rng.uniform(0, 5_000), rng)
        for _ in range(rng.randint(2, 6)):
            a, b = rng.sample(members, 2)
            _add(g, a, b, rng.uniform(20, 800), t + rng.uniform(300, 30_000), rng)

    # 自有錢包搬錢：一進一出、全額、當天——合法世界也有，但只有一跳、不成鏈、金額小
    for i in range(rng.randint(2, 8)):
        a = role(f"{tag}W{i}a", "normal")
        b = role(f"{tag}W{i}b", "normal")
        amt = rng.uniform(100, 12_000)
        t = t0 + rng.uniform(0, 30_000)
        _add(g, rng.choice(shops), a, amt, t, rng)
        _add(g, a, b, amt * rng.uniform(0.9, 1.0), t + rng.uniform(300, 7_200), rng)
        if rng.random() < 0.5:
            t_spend = t + rng.uniform(86_400, 86_400 * 10)
            _add(g, b, rng.choice(shops), amt * rng.uniform(0.1, 0.5), t_spend, rng)
    return g


def _tensors(g: nx.DiGraph):
    import torch

    nodes, raw = node_features(g)
    index = {n: i for i, n in enumerate(nodes)}
    edges = [(index[u], index[v]) for u, v in g.edges()]
    if edges:
        edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
    else:
        edge_index = torch.zeros((2, 0), dtype=torch.long)
    labels = [1 if g.nodes[n]["role"] in LAUNDERING_ROLES else 0 for n in nodes]
    y = torch.tensor(labels, dtype=torch.long)
    return raw, edge_index, y


def train(n_graphs: int = 240, epochs: int = 250, seed: int = 7, out: Path = WEIGHTS_PATH) -> dict:
    import torch
    from torch import nn

    from chainlens.models.sage import GraphSAGE

    torch.manual_seed(seed)
    graphs = [generate_training_graph(s) for s in range(seed * 1000, seed * 1000 + n_graphs)]
    n_train = int(n_graphs * 0.8)
    feats = [_tensors(g) for g in graphs]
    train_x = np.concatenate([f[0] for f in feats[:n_train]])
    mean, std = train_x.mean(axis=0), train_x.std(axis=0) + 1e-6

    def batch(items):
        xs, eis, ys, offset = [], [], [], 0
        for raw, ei, y in items:
            xs.append(torch.tensor((raw - mean) / std, dtype=torch.float32))
            eis.append(ei + offset)
            ys.append(y)
            offset += raw.shape[0]
        return torch.cat(xs), torch.cat(eis, dim=1), torch.cat(ys)

    x_tr, ei_tr, y_tr = batch(feats[:n_train])
    x_te, ei_te, y_te = batch(feats[n_train:])
    model = GraphSAGE(in_dim=len(FEATURE_NAMES), hidden_dim=16, dropout=0.3, reverse_mp=True)
    opt = torch.optim.Adam(model.parameters(), lr=3e-3, weight_decay=5e-4)
    pos = float((y_tr == 1).float().mean())
    weight = torch.tensor([pos, 1 - pos], dtype=torch.float32) * 2  # 類別加權
    loss_fn = nn.CrossEntropyLoss(weight=weight, label_smoothing=0.08)  # 避免機率飽和成 0／1
    for epoch in range(epochs):
        model.train()
        opt.zero_grad()
        loss = loss_fn(model(x_tr, ei_tr), y_tr)
        loss.backward()
        opt.step()
        if (epoch + 1) % 100 == 0:
            print(f"epoch {epoch + 1}: loss {loss.item():.4f}")

    model.eval()
    with torch.no_grad():
        pred = model(x_te, ei_te).argmax(dim=1)
    tp = int(((pred == 1) & (y_te == 1)).sum())
    fp = int(((pred == 1) & (y_te == 0)).sum())
    fn = int(((pred == 0) & (y_te == 1)).sum())
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    metrics = {
        "held_out_graphs": n_graphs - n_train,
        "held_out_nodes": int(y_te.numel()),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
    }
    print("held-out", metrics)

    params = {k: v.detach().cpu().numpy().tolist() for k, v in model.state_dict().items()}
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(
            {
                "meta": {
                    "architecture": "GraphSAGE 2-layer, hidden 16, reverse message passing",
                    "features": list(FEATURE_NAMES),
                    "train_graphs": n_train,
                    "epochs": epochs,
                    "seed": seed,
                    **metrics,
                },
                "norm": {"mean": mean.tolist(), "std": std.tolist()},
                "params": params,
            }
        ),
        encoding="utf-8",
    )
    print("wrote", out)
    return metrics


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--graphs", type=int, default=240)
    ap.add_argument("--epochs", type=int, default=250)
    ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args()
    train(a.graphs, a.epochs, a.seed)
