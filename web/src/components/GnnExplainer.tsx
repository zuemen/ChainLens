/**
 * 給非技術讀者的圖神經網路說明：同一筆交易，傳統模型只看它自己，圖神經網路連它的上下游一起看。
 * 純示意圖，不代表任何真實交易。
 */
function TxNode({ x, y, r = 14, tone }: { x: number; y: number; r?: number; tone: 'focus' | 'in' | 'out' | 'dim' }) {
  const fill = { focus: 'var(--color-text)', in: '#6B7A95', out: 'var(--color-signal)', dim: '#2A3245' }[tone]
  return <circle cx={x} cy={y} r={r} fill={fill} />
}

function Neighborhood({ active }: { active: boolean }) {
  const inbound = [
    [60, 60],
    [45, 130],
    [70, 200],
  ]
  const outbound = [
    [300, 80],
    [315, 185],
  ]
  const second = [
    [380, 55],
    [385, 215],
  ]
  return (
    <svg viewBox="0 0 420 260" className="block h-auto w-full" aria-hidden="true">
      {inbound.map(([x, y]) => (
        <line key={`il${y}`} x1={x} y1={y} x2="180" y2="130" stroke={active ? '#6B7A95' : '#2A3245'} strokeWidth="3" />
      ))}
      {outbound.map(([x, y]) => (
        <line key={`ol${y}`} x1="180" y1="130" x2={x} y2={y} stroke={active ? 'var(--color-signal)' : '#2A3245'} strokeWidth="3" />
      ))}
      <line x1="300" y1="80" x2="380" y2="55" stroke={active ? 'var(--color-signal)' : '#2A3245'} strokeWidth="2" strokeDasharray="5 4" />
      <line x1="315" y1="185" x2="385" y2="215" stroke={active ? 'var(--color-signal)' : '#2A3245'} strokeWidth="2" strokeDasharray="5 4" />
      {inbound.map(([x, y]) => (
        <TxNode key={`i${y}`} x={x} y={y} tone={active ? 'in' : 'dim'} />
      ))}
      {outbound.map(([x, y]) => (
        <TxNode key={`o${y}`} x={x} y={y} tone={active ? 'out' : 'dim'} />
      ))}
      {second.map(([x, y]) => (
        <TxNode key={`s${y}`} x={x} y={y} r={10} tone={active ? 'out' : 'dim'} />
      ))}
      <TxNode x={180} y={130} r={24} tone="focus" />
      {!active && <rect x="140" y="90" width="80" height="80" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeDasharray="6 5" />}
      <text x="180" y="176" textAnchor="middle" className="fill-text text-[14px] font-bold">
        受審交易
      </text>
      {active && (
        <>
          <text x="58" y="245" textAnchor="middle" className="fill-muted text-[13px]">錢從哪來</text>
          <text x="330" y="245" textAnchor="middle" className="fill-muted text-[13px]">錢往哪去（含兩層外）</text>
        </>
      )}
    </svg>
  )
}

export function GnnExplainer() {
  return (
    <div>
      <p className="max-w-3xl leading-relaxed">
        打個比方：審核一筆匯款時，<strong>只看金額與時間</strong>是傳統做法；
        <strong>同時查這筆錢從哪些帳戶來、接下來流向誰</strong>，就是圖神經網路的思路。
      </p>
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <figure className="border border-line bg-surface-2 p-5">
          <div className="kicker">傳統模型（如 Random Forest）</div>
          <div className="mt-1 text-xl font-black">只看這筆交易本身</div>
          <div className="mt-4">
            <Neighborhood active={false} />
          </div>
          <figcaption className="mt-3 text-sm leading-relaxed text-muted">
            輸入 165 項交易特徵（金額、手續費、輸入輸出筆數、時間等），判斷這筆是否可疑。周邊交易只以預先算好的彙總數字間接納入。
          </figcaption>
        </figure>
        <figure className="border-2 border-model bg-surface-2 p-5">
          <div className="kicker">圖神經網路（GNN）</div>
          <div className="mt-1 text-xl font-black" style={{ color: 'var(--color-model)' }}>連同上下游一起看</div>
          <div className="mt-4">
            <Neighborhood active />
          </div>
          <figcaption className="mt-3 text-sm leading-relaxed text-muted">
            模型逐層彙整相連交易的特徵：第一層看直接往來，第二層看到兩步之外。本研究採用的「反向訊息傳遞」把「錢從哪來」與「錢往哪去」分開計算，更貼近洗錢的方向性。
          </figcaption>
        </figure>
      </div>
    </div>
  )
}
