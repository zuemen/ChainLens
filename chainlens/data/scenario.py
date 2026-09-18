"""50 萬 USDT 假投資詐騙出金攔阻劇本圖（提案書第一章招牌情境）。

劇本對應提案書「劇本—角色—金流圖樣」知識圖譜之假投資鏈路：
客服收款地址（fan-in 集資）→ 集資主錢包（gather-scatter）→ 車手分散（fan-out）
→ 剝洋蔥分層（peeling chain）→ OTC 出金地址（integration）。

關鍵設計：出金目標地址 TOtcOut01 **本身從未命中任何圖樣、也不在黑名單上**，
但與集資主錢包存在二階資金關聯——用以演示「由手法找地址」對比
黑名單比對之核心差異：黑名單看不到它，結構關聯追溯看得到。

時間軸註記：假投資詐團常以「限時加碼優惠」話術誘導被害人於短時間內集中
入金，故被害人入金壓縮於約 50 分鐘窗口內，符合 fan-in 圖樣之時間窗假設。
"""

from __future__ import annotations

import networkx as nx

# 劇本角色 → 中文名稱（工作台 tooltip 與敘事用）
ROLE_ZH = {
    "victim": "被害人",
    "support": "客服收款地址",
    "aggregator": "集資主錢包",
    "mule": "車手地址",
    "peel": "剝洋蔥中繼",
    "peel_side": "剝離小額地址",
    "otc": "OTC 出金地址",
    "normal": "正常交易地址",
    "downstream": "下游收款地址",
    "smurf": "拆單人頭地址",
    "split_collector": "拆單整合地址",
    "relay": "快進快出中繼",
    "hot_wallet": "交易所熱錢包（已標註實體）",
    "exchange_user": "交易所用戶",
}

WITHDRAWAL_TARGET = "TOtcOut01"  # 交易所用戶申請出金之目標地址（可疑）
NORMAL_TARGET = "TNormalUser01"  # 對照組：正常用戶出金地址
DOWNSTREAM_TARGET = "TDownstream01"  # 延伸情境：贓款自 OTC 地址再轉一手的下游地址
SPLIT_TARGET = "TSplitOut01"  # 情境六：拆單——11 筆低於固定門檻的小額匯入同一地址
RELAY_TARGET = "TRelay03"  # 情境七：快進快出中繼——規則無圖樣可命中，由結構模型加註
EXCHANGE_USER_TARGET = "TExchUser07"  # 情境八：交易所熱錢包批次出金的正常用戶（不可誤傷）
# 出金審查 Demo 可選的八個情境（順序即前端顯示順序）
SCREEN_TARGETS = (
    WITHDRAWAL_TARGET,
    DOWNSTREAM_TARGET,
    "TMule03",
    "TVictim01",
    NORMAL_TARGET,
    SPLIT_TARGET,
    RELAY_TARGET,
    EXCHANGE_USER_TARGET,
)
WITHDRAWAL_AMOUNT_USDT = 500_000.0  # 提案書情境：50 萬 USDT 提領

# 情境中繼資料：前端情境列、簡報與 API /scenarios 共用同一份，避免三處各寫各的
SCENARIOS: tuple[dict[str, object], ...] = (
    {
        "id": 1,
        "target": WITHDRAWAL_TARGET,
        "title_zh": "乾淨的地址，髒的上游",
        "summary_zh": "用戶申請把 50 萬 USDT 提領到一個從未被通報、不在任何黑名單上的地址。",
        "pain_zh": "黑名單永遠慢一步；金檢要求評估提幣資金流向",
        "amount_usdt": WITHDRAWAL_AMOUNT_USDT,
        "expect": "block",
    },
    {
        "id": 2,
        "target": DOWNSTREAM_TARGET,
        "title_zh": "贓款再轉一手",
        "summary_zh": "OTC 出金地址收到贓款後，再轉給一個全新地址；用戶要提領到這個第三階地址。",
        "pain_zh": "單一固定門檻無法分級處置",
        "amount_usdt": WITHDRAWAL_AMOUNT_USDT,
        "expect": "review",
    },
    {
        "id": 3,
        "target": "TMule03",
        "title_zh": "車手地址直接出金",
        "summary_zh": "提領目標本身就是洗錢執行層的車手地址，但因為是新地址，尚未被任何單位通報。",
        "pain_zh": "詐騙地址用過即丟，來不及被通報",
        "amount_usdt": WITHDRAWAL_AMOUNT_USDT,
        "expect": "block",
    },
    {
        "id": 4,
        "target": "TVictim01",
        "title_zh": "被害人不連坐",
        "summary_zh": "提領目標是一位被害人的地址——曾把錢匯給詐團，但資金來源方不該被加分。",
        "pain_zh": "寧可錯殺的風控會傷害被害人與正常用戶",
        "amount_usdt": WITHDRAWAL_AMOUNT_USDT,
        "expect": "pass",
    },
    {
        "id": 5,
        "target": NORMAL_TARGET,
        "title_zh": "正常用戶",
        "summary_zh": "對照組：同一套引擎、同樣 50 萬 USDT，提領到一個只有日常小額往來的地址。",
        "pain_zh": "對照組",
        "amount_usdt": WITHDRAWAL_AMOUNT_USDT,
        "expect": "pass",
    },
    {
        "id": 6,
        "target": SPLIT_TARGET,
        "title_zh": "拆單規避固定門檻",
        "summary_zh": (
            "這筆只申請 9,000 USDT，低於業者的固定監控門檻；"
            "但同一地址 40 分鐘內已從 11 個地址各收 9,000。"
        ),
        "pain_zh": "監控門檻是固定金額，拆單就繞得過",
        "amount_usdt": 9_000.0,
        "expect": "block",
    },
    {
        "id": 7,
        "target": RELAY_TARGET,
        "title_zh": "快進快出中繼",
        "summary_zh": (
            "目標地址一進一出、每次停留不到十分鐘、金額原封不動往下傳；沒有任何規則圖樣能命中。"
        ),
        "pain_zh": "手法一變，寫死的規則就失效",
        "amount_usdt": 200_000.0,
        "expect": "review",
    },
    {
        "id": 8,
        "target": EXCHANGE_USER_TARGET,
        "title_zh": "交易所熱錢包批次出金的用戶",
        "summary_zh": (
            "某交易所熱錢包在 20 分鐘內對 30 名用戶批次出金，結構上像極了洗錢的快速分散。"
        ),
        "pain_zh": "誤報拖垮人工審查量，也趕跑正常用戶",
        "amount_usdt": 3_000.0,
        "expect": "pass",
    },
)


def _add(g: nx.DiGraph, u: str, v: str, amount: float, ts: int) -> None:
    g.add_edge(u, v, amount=amount, timestamp=ts)


def load_withdrawal_scenario(
    with_downstream: bool = False,
    *,
    with_split: bool = False,
    with_relay: bool = False,
    with_exchange_batch: bool = False,
) -> nx.DiGraph:
    """建構 50 萬 USDT 假投資詐騙劇本圖。

    with_downstream：延伸情境——OTC 出金地址事後又把款項轉給一個新地址（第 3 階）。
    with_split：情境六——集資主錢包經 11 個人頭各轉 9,000 USDT 到同一個拆單整合地址。
    with_relay：情境七——OTC02 之後三個一進一出、快進快出的中繼地址。
    with_exchange_batch：情境八——已標註的交易所熱錢包對 30 名用戶批次出金。
    每個延伸都另開旗標而非直接加進基準圖，是因為多一個節點會改變全圖百分位，
    招牌情境的 0.73／0.33／0.60 會跟著漂移（已有測試鎖定）。

    節點屬性：role（英文角色鍵，見 ROLE_ZH）。
    圖屬性：center（集資主錢包）、withdrawal_target、normal_target、
    withdrawal_amount_usdt、story_zh（劇本一句話摘要）。
    """
    g = nx.DiGraph()
    t0 = 1_760_000_000  # 劇本基準時間

    # --- 第一幕：被害人於「限時加碼」話術下 50 分鐘內集中入金 ---
    # 12 名被害人 → 3 個客服收款地址（每個客服 ≥5 個不同來源 → fan-in）
    deposits: list[tuple[str, str, float, int]] = [
        # 客服一：V01–V05
        ("TVictim01", "TSupport01", 32_000, t0 + 0),
        ("TVictim02", "TSupport01", 18_500, t0 + 240),
        ("TVictim03", "TSupport01", 55_000, t0 + 480),
        ("TVictim04", "TSupport01", 27_000, t0 + 900),
        ("TVictim05", "TSupport01", 41_000, t0 + 1_200),
        # 客服二：V05–V09（V05 重複入金，跨客服）
        ("TVictim05", "TSupport02", 12_000, t0 + 300),
        ("TVictim06", "TSupport02", 63_000, t0 + 600),
        ("TVictim07", "TSupport02", 24_500, t0 + 1_000),
        ("TVictim08", "TSupport02", 38_000, t0 + 1_500),
        ("TVictim09", "TSupport02", 29_000, t0 + 1_800),
        # 客服三：V09–V12＋V01
        ("TVictim09", "TSupport03", 15_000, t0 + 700),
        ("TVictim10", "TSupport03", 47_000, t0 + 1_100),
        ("TVictim11", "TSupport03", 22_000, t0 + 1_600),
        ("TVictim12", "TSupport03", 35_000, t0 + 2_100),
        ("TVictim01", "TSupport03", 8_000, t0 + 2_400),
    ]
    for u, v, amount, ts in deposits:
        _add(g, u, v, float(amount), ts)

    # 部分被害人被誘導「直接匯入平台主帳戶」→ 主錢包 in-來源 ≥5（gather 條件）
    _add(g, "TVictim03", "TAggregator01", 20_000.0, t0 + 2_000)
    _add(g, "TVictim08", "TAggregator01", 16_000.0, t0 + 2_300)
    _add(g, "TVictim11", "TAggregator01", 9_000.0, t0 + 2_600)

    # --- 第二幕：客服層向集資主錢包歸集（placement → layering 交界） ---
    _add(g, "TSupport01", "TAggregator01", 173_500.0, t0 + 3_000)
    _add(g, "TSupport02", "TAggregator01", 166_500.0, t0 + 3_180)
    _add(g, "TSupport03", "TAggregator01", 127_000.0, t0 + 3_360)

    # --- 第三幕：主錢包 30 分鐘內拆分至 6 個車手（fan-out / gather-scatter） ---
    mule_amounts = [85_000.0, 84_000.0, 86_000.0, 83_000.0, 87_000.0, 85_000.0]
    for i, amount in enumerate(mule_amounts, start=1):
        _add(g, "TAggregator01", f"TMule{i:02d}", amount, t0 + 3_600 + i * 280)

    # --- 第四幕：分層——剝洋蔥鏈與直轉，最終整合至 OTC 出金地址 ---
    def peel_chain(start: str, base: float, ts: int, tag: str, sink: str) -> None:
        """自 start 起 3 跳剝洋蔥（每跳保留 90%），鏈尾整合至 sink。"""
        previous, amount = start, base
        for hop in range(3):
            nxt = f"TPeel{tag}{hop}"
            keep = amount * 0.9
            _add(g, previous, nxt, keep, ts + hop * 600)
            _add(g, previous, f"TSide{tag}{hop}", amount * 0.1, ts + hop * 600 + 60)
            previous, amount = nxt, keep
        _add(g, previous, sink, amount, ts + 3 * 600)

    peel_chain("TMule01", 85_000.0, t0 + 6_000, "A", WITHDRAWAL_TARGET)
    peel_chain("TMule02", 84_000.0, t0 + 6_300, "B", WITHDRAWAL_TARGET)
    # 車手三直轉 OTC → 形成主錢包至出金地址之「二階資金關聯」
    _add(g, "TMule03", WITHDRAWAL_TARGET, 86_000.0, t0 + 6_600)
    peel_chain("TMule04", 83_000.0, t0 + 6_900, "C", "TOtcOut02")
    _add(g, "TMule05", "TOtcOut02", 87_000.0, t0 + 7_200)
    peel_chain("TMule06", 85_000.0, t0 + 7_500, "D", "TOtcOut02")

    # --- 背景：正常交易（對照組，度數低於圖樣門檻，不應誤報） ---
    _add(g, "TShopA", "TShopB", 250.0, t0 + 500)
    _add(g, "TShopB", "TShopC", 120.0, t0 + 5_000)
    _add(g, "TShopC", "TShopA", 60.0, t0 + 9_000)
    _add(g, "THotWallet01", NORMAL_TARGET, 1_200.0, t0 + 4_000)
    _add(g, "THotWallet01", "TShopA", 800.0, t0 + 4_500)
    _add(g, NORMAL_TARGET, "TShopB", 300.0, t0 + 8_000)

    # --- 延伸情境（各自獨立旗標，見 docstring） ---
    if with_split:
        # 情境六：主錢包把 99,000 拆成 11 筆 9,000 經人頭匯入同一整合地址，每筆都低於固定門檻
        for i in range(1, 12):
            smurf = f"TSmurf{i:02d}"
            _add(g, "TAggregator01", smurf, 9_000.0, t0 + 10_000 + i * 120)
            _add(g, smurf, SPLIT_TARGET, 9_000.0, t0 + 10_600 + i * 200)
    if with_relay:
        # 情境七：OTC02 之後三個一進一出的中繼，每站停留約 8 分鐘、金額原封不動
        _add(g, "TOtcOut02", "TRelay01", 200_000.0, t0 + 12_000)
        _add(g, "TRelay01", "TRelay02", 200_000.0, t0 + 12_480)
        _add(g, "TRelay02", RELAY_TARGET, 200_000.0, t0 + 12_960)
    if with_exchange_batch:
        # 情境八：已標註的交易所熱錢包 20 分鐘內對 30 名用戶批次出金（正常營運，不是洗錢）
        g.add_node(
            "THotWallet02",
            known_entity="exchange_hot_wallet",
            entity_zh="已標註之交易所熱錢包",
        )
        _add(g, "TShopB", "THotWallet02", 5_000.0, t0 - 86_400 * 20)
        _add(g, "TShopA", "THotWallet02", 12_000.0, t0 - 86_400 * 9)
        _add(g, "TShopC", "THotWallet02", 7_500.0, t0 - 86_400 * 3)
        amounts = [1_250, 3_000, 640, 9_800, 2_100, 475, 15_000, 3_300, 820, 5_600]
        for i in range(1, 31):
            amount = float(amounts[i % 10])
            _add(g, "THotWallet02", f"TExchUser{i:02d}", amount, t0 + 15_000 + i * 40)

    # --- 節點角色標註 ---
    roles: dict[str, str] = {}
    for node in g.nodes():
        name = str(node)
        if name.startswith("TVictim"):
            roles[node] = "victim"
        elif name.startswith("TSupport"):
            roles[node] = "support"
        elif name.startswith("TAggregator"):
            roles[node] = "aggregator"
        elif name.startswith("TMule"):
            roles[node] = "mule"
        elif name.startswith("TPeel"):
            roles[node] = "peel"
        elif name.startswith("TSide"):
            roles[node] = "peel_side"
        elif name.startswith("TOtcOut"):
            roles[node] = "otc"
        elif name.startswith("TSmurf"):
            roles[node] = "smurf"
        elif name.startswith("TSplitOut"):
            roles[node] = "split_collector"
        elif name.startswith("TRelay"):
            roles[node] = "relay"
        elif name == "THotWallet02":
            roles[node] = "hot_wallet"
        elif name.startswith("TExchUser"):
            roles[node] = "exchange_user"
        else:
            roles[node] = "normal"
    nx.set_node_attributes(g, roles, "role")

    g.graph.update(
        center="TAggregator01",
        withdrawal_target=WITHDRAWAL_TARGET,
        normal_target=NORMAL_TARGET,
        withdrawal_amount_usdt=WITHDRAWAL_AMOUNT_USDT,
        story_zh=(
            "交易所用戶申請將 50 萬 USDT 提領至外部地址 TOtcOut01。"
            "該地址從未被通報，但與假投資詐騙集資主錢包存在二階資金關聯。"
        ),
    )
    if with_downstream:
        g.add_node(DOWNSTREAM_TARGET, role="downstream")
        _add(g, WITHDRAWAL_TARGET, DOWNSTREAM_TARGET, 120_000.0, t0 + 9_000)
    return g
