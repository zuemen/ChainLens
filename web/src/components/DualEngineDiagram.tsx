import { useLang } from '../i18n'

/**
 * 雙引擎架構圖（純 SVG）：交易圖 → 規則引擎／GNN 模型 → 融合（模型只升不降）→ 三級處置 → 法遵人員。
 * 規則通道用文字色、模型通道用 --model 色；融合之後的三級處置用各自的處置色。
 */
export function DualEngineDiagram() {
  const { t } = useLang()
  const box = 'fill-surface stroke-line-strong'
  return (
    <figure>
      <svg
        viewBox="0 0 1200 420"
        className="block h-auto w-full"
        role="img"
        aria-label={t(
          '雙引擎架構：交易圖同時送進規則引擎與 GNN 模型；規則引擎給出暫緩、加強審查或放行，GNN 模型只能把放行升為加強審查；三級處置最後由法遵人員決定。',
          'Dual-engine architecture: the transaction graph goes to both the rule engine and the GNN model. The rule engine returns hold, enhanced review or release; the GNN model can only raise release to enhanced review; a compliance officer makes the final decision.',
        )}
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
          <text x="125" y="204" textAnchor="middle" className="fill-text text-[22px] font-black">{t('交易圖', 'Tx graph')}</text>
          <text x="125" y="232" textAnchor="middle" className="fill-muted text-[14px]">{t('TRON 鏈上 USDT 轉帳', 'On-chain USDT (TRON)')}</text>
          <text x="125" y="254" textAnchor="middle" className="fill-muted text-[14px]">{t('節點＝地址、邊＝資金流向', 'addresses + fund flows')}</text>
        </g>

        {/* 分岔到兩個引擎 */}
        <path d="M220 210 C 270 210, 270 110, 320 110" fill="none" stroke="var(--color-line-strong)" strokeWidth="2" markerEnd="url(#de-arrow)" />
        <path d="M220 210 C 270 210, 270 310, 320 310" fill="none" stroke="var(--color-model)" strokeWidth="2" markerEnd="url(#de-arrow-model)" />

        {/* 2a 規則引擎 */}
        <g>
          <rect x="325" y="40" width="300" height="140" className={box} strokeWidth="1.5" />
          <rect x="325" y="40" width="300" height="4" className="fill-text" />
          <text x="345" y="72" className="fill-muted text-[13px] font-mono">{t('02　引擎一', '02  Engine 1')}</text>
          <text x="345" y="102" className="fill-text text-[22px] font-black">{t('規則引擎', 'Rule engine')}</text>
          <text x="345" y="130" className="fill-muted text-[14px]">{t('4 類洗錢圖樣掃描＋上游 4 階關聯傳導', '4 laundering patterns, 4-hop trace')}</text>
          <text x="345" y="154" className="fill-muted text-[14px]">{t('輸出：綜合分數、證據鏈、STR 草稿', 'Output: score, evidence, STR draft')}</text>
        </g>

        {/* 2b GNN 模型 */}
        <g>
          <rect x="325" y="240" width="300" height="140" className={box} strokeWidth="1.5" />
          <rect x="325" y="240" width="300" height="4" className="fill-model" />
          <text x="345" y="272" className="fill-model text-[13px] font-mono">{t('02　引擎二', '02  Engine 2')}</text>
          <text x="345" y="302" className="fill-model text-[22px] font-black">{t('GNN 模型 GraphSAGE', 'GNN model GraphSAGE')}</text>
          <text x="345" y="330" className="fill-muted text-[14px]">{t('13 個結構特徵、2 層、反向訊息傳遞', '13 features, 2 layers, reverse MP')}</text>
          <text x="345" y="354" className="fill-muted text-[14px]">{t('輸出：洗錢基礎設施機率＋結構事實', 'Output: laundering prob. + facts')}</text>
        </g>

        {/* 到融合 */}
        <path d="M625 110 C 680 110, 680 210, 730 210" fill="none" stroke="var(--color-line-strong)" strokeWidth="2" markerEnd="url(#de-arrow)" />
        <path d="M625 310 C 680 310, 680 210, 730 210" fill="none" stroke="var(--color-model)" strokeWidth="2" strokeDasharray="7 5" markerEnd="url(#de-arrow-model)" />

        {/* 3 融合 */}
        <g>
          <rect x="735" y="150" width="200" height="120" className={box} strokeWidth="1.5" />
          <text x="835" y="182" textAnchor="middle" className="fill-muted text-[13px] font-mono">03</text>
          <text x="835" y="210" textAnchor="middle" className="fill-text text-[22px] font-black">{t('融合', 'Fusion')}</text>
          <text x="835" y="236" textAnchor="middle" className="fill-model text-[14px] font-bold">{t('模型只升不降', 'Model only escalates')}</text>
          <text x="835" y="256" textAnchor="middle" className="fill-muted text-[13px]">{t('≥0.70 時放行 → 加強審查', '≥0.70: release → review')}</text>
        </g>

        {/* 4 三級處置 */}
        <path d="M935 210 L 975 210" fill="none" stroke="var(--color-line-strong)" strokeWidth="2" markerEnd="url(#de-arrow)" />
        <g>
          <text x="985" y="120" className="fill-muted text-[13px] font-mono">{t('04　三級處置', '04  Decision')}</text>
          <rect x="985" y="132" width="120" height="44" fill="none" stroke="var(--color-signal)" strokeWidth="2" />
          <text x="1045" y="161" textAnchor="middle" className="fill-signal text-[17px] font-black">{t('暫緩出金', 'Hold')}</text>
          <rect x="985" y="188" width="120" height="44" fill="none" stroke="var(--color-review)" strokeWidth="2" />
          <text x="1045" y="217" textAnchor="middle" className="fill-review text-[17px] font-black">{t('加強審查', 'Review')}</text>
          <rect x="985" y="244" width="120" height="44" fill="none" stroke="var(--color-pass)" strokeWidth="2" />
          <text x="1045" y="273" textAnchor="middle" className="fill-pass text-[17px] font-black">{t('放行', 'Release')}</text>
        </g>

        {/* 5 法遵人員 */}
        <path d="M1045 288 L 1045 322" fill="none" stroke="var(--color-line-strong)" strokeWidth="2" markerEnd="url(#de-arrow)" />
        <g>
          <rect x="960" y="330" width="170" height="60" className={box} strokeWidth="1.5" />
          <text x="1045" y="354" textAnchor="middle" className="fill-muted text-[13px] font-mono">05</text>
          <text x="1045" y="378" textAnchor="middle" className="fill-text text-[18px] font-black">{t('法遵人員做最後決定', 'Human decides')}</text>
        </g>
      </svg>
    </figure>
  )
}
