# 決策：圖樣「參與者」與「風險承擔者」分離（risky_nodes）

日期：2026-09-17

## 問題
`evidence.py` 只給圖樣中心加分（為了不讓 fan-in 的被害人連坐），結果洗錢執行層被漂白：
劇本圖 6 個車手有 5 個、12 個剝洋蔥中繼全部判為 low。

## 決定
1. `MotifHit` 新增 `risky_nodes`：
   - fan_in → `[center]`（來源是被害人）
   - fan_out → `[center, *targets]`（下游是車手）
   - gather_scatter → `[center, *出邊對手方]`（入邊是被害人／客服收款，不連坐）
   - peeling_chain → 整條鏈
2. 證據計分、關聯追溯、工作台紅色上色一律改看 `risky_nodes`。
3. 關聯分數：下游執行層（非圖樣中心）傳導時**多衰減一階**（`Association.via_center`、`effective_distance`）。
   理由：執行層的風險繼承自上游中心；若不衰減，出金地址直接收到車手轉帳即得關聯分 1.00，
   分數飽和、失去鑑別力。排序同貢獻時中心優先，使主敘事仍指向集資主錢包。

## 結果（劇本圖實測）
- 車手 6/6、剝洋蔥中繼 12/12 → high；被害人 12/12、正常用戶 5/5 → low；集資主錢包 high
- 招牌情境數字**不變**：TOtcOut01 self 0.33／assoc 0.60／combined 0.73 → block；TNormalUser01 0.10 → pass
- 關聯證據由 6 條增為 13 條（新增 7 個執行層節點），高亮路徑不變 `TAggregator01 → TMule03 → TOtcOut01`
- 測試：新增 3 項迴歸測試鎖住上述角色判定；pytest 92 passed、vitest 34 passed、ruff 通過

## 已知取捨
- fan-out 下游全部視為風險承擔者。真實鏈上若是交易所熱錢包批次出金，其用戶會被拉到 medium 以上
  （僅圖樣分 0.5）。劇本圖的 THotWallet01 未觸發 fan-out，故未顯現。上線前需加白名單或金額／時間特徵區分。
- 剝離小額地址（TSide*）仍為 low，未列入 risky_nodes——它們是否為贓款接收方無法僅由結構判定。
