/**
 * 雙引擎架構圖（純 SVG）：交易圖 → 規則引擎／結構模型 → 融合（模型只升不降）→ 三級處置 → 法遵人員。
 * 規則通道用文字色、模型通道用 --model 色；融合之後的三級處置用各自的處置色。
 */
export function DualEngineDiagram() {
  const box = 'fill-surface stroke-line-strong'
  return (
    <figure>
      <svg
        viewBox="0 0 1200 420"
        className="block h-auto w-full"
        role="img"
        aria-label="雙引擎架構：交易圖同時送進規則引擎與結構模型；規則引擎給出暫緩、加強審查或放行，結構模型只能把放行升為加強審查；三級處置最後由法遵人員決定。"
      >
        <defs>
          <marker id="de-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0 0L10 5L0 10z" fill="var(--color-line-strong)" />
          </marker>
          <marker id="de-arrow-model" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0 0L10 5L0 10z" fill="var(--color-model)" />
          </marker>
        </defs>

        {/* 1 交易圖 */}
        <g>
          <rect x="30" y="140" width="190" height="140" className={box} strokeWidth="1.5" />
          <text x="125" y="176" textAnchor="middle" className="fill-muted text-[13px] font-mono">01</text>
          <text x="125" y="204" textAnchor="middle" className="fill-text text-[22px] font-black">交易圖</text>
          <text x="125" y="232" textAnchor="middle" className="fill-muted text-[14px]">TRON 鏈上 USDT 轉帳</text>
          <text x="125" y="254" textAnchor="middle" className="fill-muted text-[14px]">節點＝地址、邊＝資金流向</text>
        </g>

        {/* 分岔到兩個引擎 */}
        <path d="M220 210 C 270 210, 270 110, 320 110" fill="none" stroke="var(--color-line-strong)" strokeWidth="2" markerEnd="url(#de-arrow)" />
        <path d="M220 210 C 270 210, 270 310, 320 310" fill="none" stroke="var(--color-model)" strokeWidth="2" markerEnd="url(#de-arrow-model)" />

        {/* 2a 規則引擎 */}
        <g>
          <rect x="325" y="40" width="300" height="140" className={box} strokeWidth="1.5" />
          <rect x="325" y="40" width="300" height="4" className="fill-text" />
          <text x="345" y="72" className="fill-muted text-[13px] font-mono">02　引擎一</text>
          <text x="345" y="102" className="fill-text text-[22px] font-black">規則引擎</text>
          <text x="345" y="130" className="fill-muted text-[14px]">4 類洗錢圖樣掃描＋上游 4 階關聯傳導</text>
          <text x="345" y="154" className="fill-muted text-[14px]">輸出：綜合分數、證據鏈、STR 草稿</text>
        </g>

        {/* 2b 結構模型 */}
        <g>
          <rect x="325" y="240" width="300" height="140" className={box} strokeWidth="1.5" />
          <rect x="325" y="240" width="300" height="4" className="fill-model" />
          <text x="345" y="272" className="fill-model text-[13px] font-mono">02　引擎二</text>
          <text x="345" y="302" className="fill-model text-[22px] font-black">結構模型 GraphSAGE</text>
          <text x="345" y="330" className="fill-muted text-[14px]">13 個結構特徵、2 層、反向訊息傳遞</text>
          <text x="345" y="354" className="fill-muted text-[14px]">輸出：洗錢基礎設施機率＋結構事實</text>
        </g>

        {/* 到融合 */}
        <path d="M625 110 C 680 110, 680 210, 730 210" fill="none" stroke="var(--color-line-strong)" strokeWidth="2" markerEnd="url(#de-arrow)" />
        <path d="M625 310 C 680 310, 680 210, 730 210" fill="none" stroke="var(--color-model)" strokeWidth="2" strokeDasharray="7 5" markerEnd="url(#de-arrow-model)" />

        {/* 3 融合 */}
        <g>
          <rect x="735" y="150" width="200" height="120" className={box} strokeWidth="1.5" />
          <text x="835" y="182" textAnchor="middle" className="fill-muted text-[13px] font-mono">03</text>
          <text x="835" y="210" textAnchor="middle" className="fill-text text-[22px] font-black">融合</text>
          <text x="835" y="236" textAnchor="middle" className="fill-model text-[14px] font-bold">模型只升不降</text>
          <text x="835" y="256" textAnchor="middle" className="fill-muted text-[13px]">≥0.70 時放行 → 加強審查</text>
        </g>

        {/* 4 三級處置 */}
        <path d="M935 210 L 975 210" fill="none" stroke="var(--color-line-strong)" strokeWidth="2" markerEnd="url(#de-arrow)" />
        <g>
          <text x="985" y="120" className="fill-muted text-[13px] font-mono">04　三級處置</text>
          <rect x="985" y="132" width="120" height="44" fill="none" stroke="var(--color-signal)" strokeWidth="2" />
          <text x="1045" y="161" textAnchor="middle" className="fill-signal text-[17px] font-black">暫緩出金</text>
          <rect x="985" y="188" width="120" height="44" fill="none" stroke="var(--color-review)" strokeWidth="2" />
          <text x="1045" y="217" textAnchor="middle" className="fill-review text-[17px] font-black">加強審查</text>
          <rect x="985" y="244" width="120" height="44" fill="none" stroke="var(--color-pass)" strokeWidth="2" />
          <text x="1045" y="273" textAnchor="middle" className="fill-pass text-[17px] font-black">放行</text>
        </g>

        {/* 5 法遵人員 */}
        <path d="M1045 288 L 1045 322" fill="none" stroke="var(--color-line-strong)" strokeWidth="2" markerEnd="url(#de-arrow)" />
        <g>
          <rect x="960" y="330" width="170" height="60" className={box} strokeWidth="1.5" />
          <text x="1045" y="354" textAnchor="middle" className="fill-muted text-[13px] font-mono">05</text>
          <text x="1045" y="378" textAnchor="middle" className="fill-text text-[18px] font-black">法遵人員做最後決定</text>
        </g>
      </svg>
    </figure>
  )
}
